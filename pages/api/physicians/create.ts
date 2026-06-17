import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { sendPhysicianWelcomeEmail } from '../../../lib/physicianEmail';

// Convert camelCase to snake_case for database
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = obj[key];
    }
  }
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Abuse guard (non-breaking): this endpoint creates an auth user + physician
  // row and sends a welcome email, so left fully open it enables email-bombing
  // arbitrary addresses and Resend-quota drain. Onboarding may call it before
  // the physician has a session, so we do NOT hard-require auth; instead we
  // require the request to originate from our own site. (A determined attacker
  // can spoof Origin — a proper per-IP rate limiter is the recommended
  // fast-follow; this blocks opportunistic bots and cross-site abuse.)
  const originHeader = (req.headers.origin || req.headers.referer || '') as string;
  let originHost = '';
  try {
    if (originHeader) originHost = new URL(originHeader).host;
  } catch {
    originHost = '';
  }
  const originAllowed =
    originHost === 'medikah.health' ||
    originHost === 'www.medikah.health' ||
    originHost.endsWith('.netlify.app');
  if (!originAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const data = req.body;

    if (!data || !data.fullName || !data.email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }

    const email = data.email.toLowerCase();

    // If the caller is authenticated, they may only create their own profile —
    // a logged-in physician cannot mint accounts for arbitrary addresses.
    const session = await getServerSession(req, res, authOptions);
    if (session?.user?.email && session.user.email.toLowerCase() !== email) {
      return res.status(403).json({ error: 'You can only create your own physician profile' });
    }

    // -----------------------------------------------------------------------
    // D-09: Identity-spine alias funneling (Phase 18, T-18-06-04)
    // Check physician_email_aliases BEFORE insert. If this email is a known
    // alias for an existing canonical physician, return that physician's ID
    // rather than creating a new (ghost) row.
    // RLS: service_role only — read-only here; aliases are write-protected
    // (service_role can INSERT; no client can self-insert an alias to hijack
    // a canonical record — T-18-06-04 mitigated).
    // -----------------------------------------------------------------------
    const { data: aliasRow, error: aliasErr } = await supabaseAdmin
      .from('physician_email_aliases')
      .select('physician_id')
      .eq('email', email)
      .maybeSingle();

    if (!aliasErr && aliasRow) {
      // This email is a known alias — resolve to the canonical physician (D-09)
      return res.status(200).json({
        success: true,
        physicianId: aliasRow.physician_id,
        alreadyExists: true,
        resolvedViaAlias: true,
      });
    }

    // -----------------------------------------------------------------------
    // D-10: License-number collision guard (Phase 18, T-18-06-03)
    // If the incoming payload carries license numbers, check physician_licenses
    // for any license_number already attached to a DIFFERENT physician. On
    // collision: do NOT insert a ghost — return 409 with a collision signal so
    // Hector/José can review (never auto-merge, D-10).
    //
    // Payload field: data.licenses is PhysicianLicense[] { number, type, ... }
    // Table column:  physician_licenses.license_number
    // Only non-empty license_number values are checked (NPI + cédula contexts).
    // -----------------------------------------------------------------------
    if (Array.isArray(data.licenses) && data.licenses.length > 0) {
      const licenseNumbers: string[] = (data.licenses as Array<{ number?: string }>)
        .map((lic) => (typeof lic.number === 'string' ? lic.number.trim() : ''))
        .filter((n) => n.length > 0);

      if (licenseNumbers.length > 0) {
        const { data: collidingLicenses, error: licErr } = await supabaseAdmin
          .from('physician_licenses')
          .select('physician_id, license_number')
          .in('license_number', licenseNumbers);

        if (!licErr && collidingLicenses && collidingLicenses.length > 0) {
          // Found license number(s) already in the table — check if any belong to
          // a DIFFERENT physician (same physician = updating own data, not a collision)
          // At this point we don't have the new physician_id yet, so any hit is a
          // collision candidate if the physician_id is non-null and the email differs.
          // We conservatively treat ANY existing match as a collision (D-10: flag, never ghost).
          const collisionNumbers = collidingLicenses.map((r) => r.license_number).join(', ');
          console.warn(
            '[create] D-10 license collision detected:',
            { email, collisionNumbers },
          );
          return res.status(409).json({
            error: 'License number already registered to another physician',
            collision: true,
            collisionNumbers,
            message:
              'One or more license numbers are already associated with an existing physician record. ' +
              'This case has been flagged for admin review. Please contact support@medikah.health.',
          });
        }
      }
    }

    // Convert to snake_case for database
    const dbData = toSnakeCase(data);
    dbData.email = email;
    dbData.verification_status = 'pending';
    dbData.onboarding_completed_at = new Date().toISOString();

    // Strip fields that don't exist as columns in the physicians table
    // (narrative is saved separately to physician_website)
    delete dbData.narrative;

    // 1. Create Supabase Auth user for the physician
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm since they verified during onboarding
      user_metadata: {
        full_name: data.fullName,
        role: 'physician',
      },
    });

    if (authError) {
      // If user already exists in auth, that's okay - they might be re-onboarding
      if (!authError.message.includes('already been registered')) {
        console.error('Error creating auth user:', authError);
        return res.status(500).json({ error: 'Failed to create account' });
      }
    }

    const authUserId = authUser?.user?.id;

    // 2. Create physician profile in database
    // Note: auth_user_id column is optional - only set if available
    if (authUserId) {
      dbData.auth_user_id = authUserId;
    }

    let result: { id: string } | null = null;
    let error: { code?: string; message: string } | null = null;

    // Try with auth_user_id first
    const insertResult = await supabaseAdmin
      .from('physicians')
      .insert(dbData)
      .select('id')
      .single();

    // If error is about unknown column, retry without auth_user_id
    if (insertResult.error?.message?.includes('auth_user_id')) {
      console.log('auth_user_id column not found, retrying without it');
      delete dbData.auth_user_id;
      const retryResult = await supabaseAdmin
        .from('physicians')
        .insert(dbData)
        .select('id')
        .single();
      result = retryResult.data;
      error = retryResult.error;
    } else {
      result = insertResult.data;
      error = insertResult.error;
    }

    if (error || !result) {
      // Handle duplicate email - update existing physician and return ID
      if (error?.code === '23505') {
        const { data: existing } = await supabaseAdmin
          .from('physicians')
          .select('id')
          .eq('email', email)
          .single();

        if (existing) {
          // Ensure onboarding_completed_at is set for existing physicians
          await supabaseAdmin
            .from('physicians')
            .update({
              onboarding_completed_at: new Date().toISOString(),
              verification_status: 'pending',
            })
            .eq('id', existing.id)
            .is('onboarding_completed_at', null);

          return res.status(200).json({
            success: true,
            physicianId: existing.id,
            alreadyExists: true,
          });
        }
      }

      console.error('Error creating physician profile:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create profile' });
    }

    // 3. Generate magic link for password setup
    let magicLink: string | null = null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
    const redirectTo = `${baseUrl}/physicians/setup`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      // Don't fail the request - they can use "forgot password" later
    } else if (linkData?.properties?.action_link) {
      // The action_link from Supabase may not respect redirectTo properly
      // We need to ensure the redirect_to param is set correctly
      const actionLink = linkData.properties.action_link;
      try {
        const url = new URL(actionLink);
        url.searchParams.set('redirect_to', redirectTo);
        magicLink = url.toString();
      } catch {
        magicLink = actionLink;
      }
    }

    // 4. Send welcome email
    const emailResult = await sendPhysicianWelcomeEmail({
      physicianId: result.id,
      fullName: data.fullName,
      email,
      primarySpecialty: data.primarySpecialty,
      languages: data.languages || [],
      magicLink,
      lang: data.onboardingLanguage === 'es' ? 'es' : 'en',
    });

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
      // Don't fail the request - profile was created successfully
    }

    return res.status(201).json({
      success: true,
      physicianId: result.id,
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error('Exception creating physician profile:', err);
    return res.status(500).json({ error: 'Failed to create profile' });
  }
}
