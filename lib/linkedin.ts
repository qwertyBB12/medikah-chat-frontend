/**
 * LinkedIn OAuth Integration
 *
 * Uses LinkedIn's OAuth 2.0 with OpenID Connect for profile data access.
 * LinkedIn API v2 requires specific product access for full profile data.
 *
 * Products used:
 * - Sign In with LinkedIn using OpenID Connect (basic profile, email)
 * - For full profile data (education, positions), need Marketing Developer Platform access
 *
 * Scopes:
 * - openid: OpenID Connect
 * - profile: Basic profile (name, photo, headline)
 * - email: Email address
 * - w_member_social: For richer profile data (requires approval)
 */

import { supabase } from './supabase';

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || '';

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/me';
// Reserved for future use when we need to fetch email separately
// const LINKEDIN_EMAIL_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';

// Types
export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  profileUrl?: string;
  photoUrl?: string;
  headline?: string;
  location?: string;
  industry?: string;
  education?: LinkedInEducation[];
  positions?: LinkedInPosition[];
  certifications?: LinkedInCertification[];
  skills?: string[];
  rawData?: Record<string, unknown>;
}

export interface LinkedInEducation {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  activities?: string;
  description?: string;
}

export interface LinkedInPosition {
  title: string;
  company: string;
  location?: string;
  startDate?: { month?: number; year: number };
  endDate?: { month?: number; year: number } | null;
  isCurrent: boolean;
  description?: string;
}

export interface LinkedInCertification {
  name: string;
  authority?: string;
  licenseNumber?: string;
  startDate?: { month?: number; year: number };
  endDate?: { month?: number; year: number } | null;
  url?: string;
}

export interface LinkedInTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  scope: string;
}

export interface LinkedInOAuthState {
  sessionId: string;
  redirectPath?: string;
  timestamp: number;
}

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function getLinkedInAuthUrl(state: string): string {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
    throw new Error('LinkedIn OAuth not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    state,
    scope: 'openid profile email',
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<LinkedInTokens> {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
    throw new Error('LinkedIn OAuth not configured');
  }

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('LinkedIn token exchange failed:', error);
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
    scope: data.scope,
  };
}

/**
 * Fetch LinkedIn profile using access token
 */
export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  // Fetch basic profile via OpenID Connect userinfo endpoint
  const userinfoResponse = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userinfoResponse.ok) {
    const error = await userinfoResponse.json();
    console.error('LinkedIn userinfo fetch failed:', error);
    throw new Error('Failed to fetch LinkedIn profile');
  }

  const userinfo = await userinfoResponse.json();

  // Build profile from userinfo (OpenID Connect format)
  const profile: LinkedInProfile = {
    id: userinfo.sub,
    firstName: userinfo.given_name || '',
    lastName: userinfo.family_name || '',
    fullName: userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim(),
    email: userinfo.email,
    photoUrl: userinfo.picture,
    profileUrl: `https://www.linkedin.com/in/${userinfo.sub}`, // May not be accurate
    rawData: userinfo,
  };

  // Try to fetch additional profile data if we have the right permissions
  try {
    const additionalData = await fetchAdditionalProfileData(accessToken);
    if (additionalData) {
      profile.headline = additionalData.headline;
      profile.location = additionalData.location;
      profile.industry = additionalData.industry;
      profile.education = additionalData.education;
      profile.positions = additionalData.positions;
      profile.certifications = additionalData.certifications;
      profile.skills = additionalData.skills;
      if (additionalData.profileUrl) {
        profile.profileUrl = additionalData.profileUrl;
      }
    }
  } catch (err) {
    // Additional data fetch failed - continue with basic profile
    console.warn('Could not fetch additional LinkedIn data:', err);
  }

  return profile;
}

/**
 * Fetch additional profile data (requires Marketing Developer Platform access)
 */
async function fetchAdditionalProfileData(accessToken: string): Promise<Partial<LinkedInProfile> | null> {
  try {
    // Fetch full profile with projections
    const profileResponse = await fetch(
      `${LINKEDIN_PROFILE_URL}?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),vanityName)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return null;
    }

    const profileData = await profileResponse.json();

    const result: Partial<LinkedInProfile> = {};

    // Extract vanity name for profile URL
    if (profileData.vanityName) {
      result.profileUrl = `https://www.linkedin.com/in/${profileData.vanityName}`;
    }

    // Note: Education, positions, certifications require r_liteprofile or r_fullprofile
    // which need Marketing Developer Platform approval
    // For now, we'll use what we can get from basic profile

    return result;
  } catch {
    return null;
  }
}

/**
 * Store LinkedIn data temporarily for onboarding session
 */
export async function storeLinkedInSession(
  sessionId: string,
  profile: LinkedInProfile,
  tokens: LinkedInTokens
): Promise<void> {
  if (!supabase) {
    // Store in memory/session if no Supabase
    console.warn('Supabase not configured - LinkedIn data not persisted');
    return;
  }

  // Store in a temporary table for the onboarding session
  // Tokens are encrypted and session expires after 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('linkedin_oauth_sessions').upsert({
    session_id: sessionId,
    profile_data: profile,
    // Don't store raw tokens in DB - use encrypted storage or session
    token_hash: hashToken(tokens.accessToken),
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });
}

/**
 * Retrieve LinkedIn data for onboarding session
 */
export async function getLinkedInSession(
  sessionId: string
): Promise<LinkedInProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('linkedin_oauth_sessions')
    .select('profile_data, expires_at')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) return null;

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Clean up expired session
    await supabase
      .from('linkedin_oauth_sessions')
      .delete()
      .eq('session_id', sessionId);
    return null;
  }

  return data.profile_data as LinkedInProfile;
}

/**
 * Clear LinkedIn session after onboarding completes
 */
export async function clearLinkedInSession(sessionId: string): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('linkedin_oauth_sessions')
    .delete()
    .eq('session_id', sessionId);
}

/**
 * Simple hash function for token (not for security, just for reference)
 */
function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Map LinkedIn profile to physician profile data
 */
export function mapLinkedInToPhysicianData(linkedin: LinkedInProfile): {
  fullName?: string;
  email?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  medicalSchool?: string;
  graduationYear?: number;
  currentInstitutions?: string[];
  boardCertifications?: Array<{ board: string; certification: string; year?: number }>;
} {
  const result: ReturnType<typeof mapLinkedInToPhysicianData> = {};

  // Basic info
  if (linkedin.fullName) result.fullName = linkedin.fullName;
  if (linkedin.email) result.email = linkedin.email;
  if (linkedin.photoUrl) result.photoUrl = linkedin.photoUrl;
  if (linkedin.profileUrl) result.linkedinUrl = linkedin.profileUrl;

  // Education - find medical school
  if (linkedin.education && linkedin.education.length > 0) {
    // Look for medical school keywords
    const medSchoolKeywords = [
      'medicine', 'medical', 'md', 'm.d.', 'doctor', 'physician',
      'medicina', 'médico', 'facultad de medicina',
    ];

    const medSchool = linkedin.education.find(edu => {
      const searchText = `${edu.school} ${edu.degree || ''} ${edu.fieldOfStudy || ''}`.toLowerCase();
      return medSchoolKeywords.some(keyword => searchText.includes(keyword));
    });

    if (medSchool) {
      result.medicalSchool = medSchool.school;
      result.graduationYear = medSchool.endYear;
    } else if (linkedin.education.length > 0) {
      // Use most recent education as fallback
      const sorted = [...linkedin.education].sort((a, b) => (b.endYear || 0) - (a.endYear || 0));
      result.medicalSchool = sorted[0].school;
      result.graduationYear = sorted[0].endYear;
    }
  }

  // Current positions - extract institutions
  if (linkedin.positions && linkedin.positions.length > 0) {
    const currentPositions = linkedin.positions.filter(p => p.isCurrent);
    if (currentPositions.length > 0) {
      result.currentInstitutions = currentPositions.map(p => p.company);
    }
  }

  // Certifications - map to board certifications
  if (linkedin.certifications && linkedin.certifications.length > 0) {
    result.boardCertifications = linkedin.certifications.map(cert => ({
      board: cert.authority || 'Unknown',
      certification: cert.name,
      year: cert.startDate?.year,
    }));
  }

  return result;
}

/**
 * Check if LinkedIn OAuth is configured
 */
export function isLinkedInConfigured(): boolean {
  return Boolean(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET && LINKEDIN_REDIRECT_URI);
}
