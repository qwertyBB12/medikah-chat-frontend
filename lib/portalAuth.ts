/**
 * Portal Authentication Utilities
 *
 * Functions for detecting user roles and managing portal access.
 */

import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseServer';

export type PortalRole = 'patient' | 'physician' | 'insurer' | 'employer';

/**
 * Detect user role based on email
 * Checks physicians table first, defaults to patient
 */
export async function detectUserRole(email: string): Promise<PortalRole> {
  if (!supabase || !email) return 'patient';

  try {
    // Check if user is a physician
    const { data: physician } = await supabase
      .from('physicians')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (physician) return 'physician';

    // Future: Check insurers table
    // Future: Check employers table

    return 'patient';
  } catch (error) {
    console.error('Error detecting user role:', error);
    return 'patient';
  }
}

/**
 * Get physician onboarding status
 */
export async function getPhysicianOnboardingStatus(email: string): Promise<{
  isOnboarded: boolean;
  physicianId: string | null;
  verificationStatus: string | null;
  hasConsent: boolean;
}> {
  if (!supabase || !email) {
    return {
      isOnboarded: false,
      physicianId: null,
      verificationStatus: null,
      hasConsent: false,
    };
  }

  try {
    // Get physician record
    const { data: physician } = await supabase
      .from('physicians')
      .select('id, verification_status, onboarding_completed_at, consent_signed_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!physician) {
      return {
        isOnboarded: false,
        physicianId: null,
        verificationStatus: null,
        hasConsent: false,
      };
    }

    return {
      isOnboarded: !!physician.onboarding_completed_at,
      physicianId: physician.id,
      verificationStatus: physician.verification_status,
      hasConsent: !!physician.consent_signed_at,
    };
  } catch (error) {
    console.error('Error checking physician status:', error);
    return {
      isOnboarded: false,
      physicianId: null,
      verificationStatus: null,
      hasConsent: false,
    };
  }
}

/**
 * Get the appropriate portal redirect URL for a given role
 */
export function getPortalRedirect(role: PortalRole): string {
  switch (role) {
    case 'physician':
      return '/physicians';
    case 'insurer':
      return '/insurers';
    case 'employer':
      return '/employers';
    case 'patient':
    default:
      return '/patients';
  }
}

/**
 * Check if a user has valid patient consent
 */
export async function hasValidPatientConsent(
  userId: string,
  requiredVersion?: string
): Promise<boolean> {
  if (!supabase || !userId) return false;

  try {
    let query = supabase
      .from('consent_records')
      .select('id')
      .eq('user_id', userId)
      .eq('form_type', 'cross_border_ack')
      .limit(1);

    if (requiredVersion) {
      query = query.eq('form_version', requiredVersion);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking patient consent:', error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Ensure a Supabase Auth user exists for a social login.
 * Uses create-first approach to avoid full table scan.
 * Returns the Supabase user ID.
 */
export async function ensureSupabaseUser(
  email: string,
  metadata: { name?: string | null; provider?: string; image?: string | null }
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  // Try to create the user first (fast path for new users)
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: metadata.name ?? undefined,
      provider: metadata.provider,
      image: metadata.image ?? undefined,
    },
  });

  if (!createError && newUser?.user) {
    return newUser.user.id;
  }

  // If user already exists, look up by email via RPC function
  if (createError?.message?.includes('already been registered')) {
    const { data: userId, error: rpcError } = await supabaseAdmin
      .rpc('get_user_id_by_email', { lookup_email: email.toLowerCase() });

    if (!rpcError && userId) {
      return userId as string;
    }

    // Fallback: paginated lookup with filter (in case RPC is not yet deployed)
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (listError) {
      throw new Error(`Failed to look up user: ${listError.message}`);
    }

    // The paginated API doesn't support email filter, so use listUsers with a small scan
    // as a last resort. This should rarely be hit once the RPC function is deployed.
    const { data: allData, error: allError } = await supabaseAdmin.auth.admin.listUsers();
    if (allError) {
      throw new Error(`Failed to list users: ${allError.message}`);
    }

    const existingUser = allData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return existingUser.id;
    }

    throw new Error(`User with email ${email} exists but could not be found`);
  }

  throw new Error(`Failed to create user: ${createError?.message ?? 'Unknown error'}`);
}
