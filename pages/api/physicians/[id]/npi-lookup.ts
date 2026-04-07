import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { lookupNPI } from '../../../../lib/npiLookup';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const physicianId = req.query.id as string;

    if (!physicianId) {
      return res.status(400).json({ error: 'Physician ID is required' });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(physicianId)) {
      return res.status(400).json({ error: 'Invalid physician ID format' });
    }

    // Ownership check: session email must match physician email (T-05-06)
    const { data: physician, error: lookupError } = await supabaseAdmin
      .from('physicians')
      .select('id, email, full_name')
      .eq('id', physicianId)
      .single();

    if (lookupError || !physician) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (physician.email !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { npiNumber } = req.body;

    if (!npiNumber || typeof npiNumber !== 'string') {
      return res.status(400).json({ error: 'npiNumber is required' });
    }

    // Call NPPES NPI Registry API (T-05-07: server-side only — client cannot forge verification_status)
    const result = await lookupNPI(npiNumber);

    // Check if NPI row already exists for this physician
    const { data: existingLicense } = await supabaseAdmin
      .from('physician_licenses')
      .select('id')
      .eq('physician_id', physicianId)
      .eq('license_type', 'npi')
      .eq('country_code', 'US')
      .maybeSingle();

    // NPI identity cross-verification: compare NPPES name to physician profile name
    const normalizeNameForComparison = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    let nameMatch = true;
    let verificationStatusToWrite: 'verified' | 'manual_review' = 'verified';

    if (result.found && physician.full_name) {
      const nppsName = normalizeNameForComparison(result.fullName || '');
      const profileName = normalizeNameForComparison(physician.full_name || '');

      const profileWords = profileName.split(' ').filter((w) => w.length > 1);
      const nppsWords = nppsName.split(' ').filter((w) => w.length > 1);

      const matchingWords = profileWords.filter((pw) => nppsWords.includes(pw));
      nameMatch = matchingWords.length >= Math.min(2, profileWords.length);

      if (!nameMatch) {
        verificationStatusToWrite = 'manual_review';
      }
    }

    if (result.found) {
      if (existingLicense) {
        // UPDATE existing NPI row
        await supabaseAdmin
          .from('physician_licenses')
          .update({
            license_number: npiNumber,
            verification_status: verificationStatusToWrite,
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLicense.id);
      } else {
        // INSERT new NPI row
        await supabaseAdmin
          .from('physician_licenses')
          .insert({
            physician_id: physicianId,
            country_code: 'US',
            license_type: 'npi',
            license_number: npiNumber,
            verification_status: verificationStatusToWrite,
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
          });
      }

      return res.status(200).json({
        success: true,
        data: {
          fullName: result.fullName,
          primarySpecialty: result.primarySpecialty,
          practiceState: result.practiceState,
          credential: result.credential,
          npiNumber: result.npiNumber,
          enumerationDate: result.enumerationDate,
          status: result.status,
        },
        nameMatch,
        verificationStatus: verificationStatusToWrite,
      });
    } else {
      // NPI not found — still persist the failed lookup
      if (existingLicense) {
        await supabaseAdmin
          .from('physician_licenses')
          .update({
            license_number: npiNumber,
            verification_status: 'failed',
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLicense.id);
      } else {
        await supabaseAdmin
          .from('physician_licenses')
          .insert({
            physician_id: physicianId,
            country_code: 'US',
            license_type: 'npi',
            license_number: npiNumber,
            verification_status: 'failed',
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
          });
      }

      return res.status(200).json({
        success: true,
        found: false,
        error: result.error,
      });
    }
  } catch (err) {
    console.error('NPI lookup API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
