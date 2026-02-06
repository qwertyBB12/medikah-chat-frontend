import type { NextApiRequest, NextApiResponse } from 'next';
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

  try {
    const data = req.body;

    if (!data || !data.fullName || !data.email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }

    const email = data.email.toLowerCase();

    // Convert to snake_case for database
    const dbData = toSnakeCase(data);
    dbData.email = email;

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

    if (error) {
      console.error('Error creating physician profile:', error);

      // Check for duplicate email
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }

      return res.status(500).json({ error: error.message });
    }

    // 3. Generate magic link for password setup
    let magicLink: string | null = null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${baseUrl}/physicians/dashboard?welcome=true`,
      },
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      // Don't fail the request - they can use "forgot password" later
    } else {
      magicLink = linkData?.properties?.action_link || null;
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
