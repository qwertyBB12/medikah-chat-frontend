import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import type { ContactInfo, SaveContactPayload } from '../../../../lib/contactTypes';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whitelist of valid contact field names (T-07-03 — prevents arbitrary column updates)
const CONTACT_FIELDS: (keyof ContactInfo)[] = [
  'phoneNumber',
  'faxNumber',
  'mailingAddressLine1',
  'mailingAddressCity',
  'mailingAddressState',
  'mailingAddressPostalCode',
  'mailingAddressCountry',
  'practiceAddressLine1',
  'practiceAddressCity',
  'practiceAddressState',
  'practiceAddressPostalCode',
  'practiceAddressCountry',
];

// Static camelCase → snake_case lookup — no string manipulation (T-07-03)
const FIELD_TO_COLUMN: Record<keyof ContactInfo, string> = {
  phoneNumber: 'phone_number',
  faxNumber: 'fax_number',
  mailingAddressLine1: 'mailing_address_line1',
  mailingAddressCity: 'mailing_address_city',
  mailingAddressState: 'mailing_address_state',
  mailingAddressPostalCode: 'mailing_address_postal_code',
  mailingAddressCountry: 'mailing_address_country',
  practiceAddressLine1: 'practice_address_line1',
  practiceAddressCity: 'practice_address_city',
  practiceAddressState: 'practice_address_state',
  practiceAddressPostalCode: 'practice_address_postal_code',
  practiceAddressCountry: 'practice_address_country',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method guard — accept GET and PUT only
  if (!['GET', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth guard (T-07-04)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Database null check
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Extract physician ID from route params
  const { id: physicianId } = req.query;
  if (!physicianId || typeof physicianId !== 'string' || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  // Ownership check (T-07-04, T-07-05): authenticated user must own this physician record
  const { data: physician, error: lookupError } = await supabaseAdmin
    .from('physicians')
    .select('id, email')
    .eq('id', physicianId)
    .single();

  if (lookupError || !physician) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (physician.email !== session.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ----------------------------------------------------------------
    // GET — return contact info for the authenticated physician's own record (T-07-05)
    // ----------------------------------------------------------------
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('physicians')
        .select(
          'phone_number, fax_number, mailing_address_line1, mailing_address_city, mailing_address_state, mailing_address_postal_code, mailing_address_country, practice_address_line1, practice_address_city, practice_address_state, practice_address_postal_code, practice_address_country'
        )
        .eq('id', physicianId)
        .single();

      if (error) {
        console.error('Failed to fetch contact info:', error);
        return res.status(500).json({ error: 'Failed to fetch contact info' });
      }

      // Manual camelCase mapping — symmetric with PUT's FIELD_TO_COLUMN
      const contact: Partial<ContactInfo> = {
        phoneNumber: data.phone_number || '',
        faxNumber: data.fax_number || '',
        mailingAddressLine1: data.mailing_address_line1 || '',
        mailingAddressCity: data.mailing_address_city || '',
        mailingAddressState: data.mailing_address_state || '',
        mailingAddressPostalCode: data.mailing_address_postal_code || '',
        mailingAddressCountry: data.mailing_address_country || '',
        practiceAddressLine1: data.practice_address_line1 || '',
        practiceAddressCity: data.practice_address_city || '',
        practiceAddressState: data.practice_address_state || '',
        practiceAddressPostalCode: data.practice_address_postal_code || '',
        practiceAddressCountry: data.practice_address_country || '',
      };

      return res.status(200).json(contact);
    }

    // ----------------------------------------------------------------
    // PUT — update a single contact field (T-07-03 — whitelisted fields only)
    // ----------------------------------------------------------------
    if (req.method === 'PUT') {
      const body = req.body as SaveContactPayload;

      if (!body || !body.field || body.value === undefined) {
        return res.status(400).json({ error: 'field and value are required' });
      }

      const { field, value } = body;

      // Whitelist check (T-07-03) — reject any field not in the known set
      if (!CONTACT_FIELDS.includes(field as keyof ContactInfo)) {
        return res.status(400).json({ error: `Unknown field: ${field}` });
      }

      // phone_number must be non-empty if provided
      if (field === 'phoneNumber' && typeof value === 'string' && value.trim() === '') {
        return res.status(400).json({ error: 'phoneNumber cannot be empty' });
      }

      const column = FIELD_TO_COLUMN[field as keyof ContactInfo];

      const { error } = await supabaseAdmin
        .from('physicians')
        .update({ [column]: value })
        .eq('id', physicianId);

      if (error) {
        console.error('Failed to update contact field:', error);
        return res.status(500).json({ error: 'Failed to save contact info' });
      }

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('Contact handler exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
