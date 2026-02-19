import { supabase } from './supabase';

// Types matching the database schema
export interface PhysicianLicense {
  country: string;
  countryCode: string;
  type: string;
  number: string;
  state?: string; // For USA licenses
}

export interface BoardCertification {
  board: string;
  certification: string;
  year?: number;
}

export interface Residency {
  institution: string;
  specialty: string;
  startYear: number;
  endYear: number;
}

export interface Fellowship {
  institution: string;
  specialty: string;
  startYear: number;
  endYear: number;
}

export interface Publication {
  title: string;
  journal?: string;
  year?: number;
  url?: string;
}

export interface Presentation {
  title: string;
  conference: string;
  year?: number;
}

export interface Book {
  title: string;
  publisher?: string;
  year?: number;
  role: 'author' | 'contributor' | 'editor';
}

export interface PhysicianProfileData {
  // Identity
  fullName: string;
  email: string;
  bio?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  linkedinImported?: boolean;

  // Licensing
  licenses: PhysicianLicense[];

  // Specialty
  primarySpecialty?: string;
  subSpecialties?: string[];
  boardCertifications?: BoardCertification[];

  // Education
  medicalSchool?: string;
  medicalSchoolCountry?: string;
  graduationYear?: number;
  honors?: string[];

  // Training
  residency?: Residency[];
  fellowships?: Fellowship[];

  // Intellectual
  googleScholarUrl?: string;
  publications?: Publication[];
  presentations?: Presentation[];
  books?: Book[];

  // Professional Presence
  currentInstitutions?: string[];
  websiteUrl?: string;
  twitterUrl?: string;
  researchgateUrl?: string;
  academiaEduUrl?: string;

  // Availability
  availableDays?: string[];
  availableHoursStart?: string;
  availableHoursEnd?: string;
  timezone?: string;
  languages: string[];

  // Onboarding metadata
  onboardingLanguage: string;
}

// Convert camelCase to snake_case for database
function toSnakeCase(data: PhysicianProfileData): Record<string, unknown> {
  return {
    full_name: data.fullName,
    email: data.email,
    bio: data.bio,
    photo_url: data.photoUrl,
    linkedin_url: data.linkedinUrl,
    linkedin_imported: data.linkedinImported || false,
    licenses: data.licenses,
    primary_specialty: data.primarySpecialty,
    sub_specialties: data.subSpecialties || [],
    board_certifications: data.boardCertifications || [],
    medical_school: data.medicalSchool,
    medical_school_country: data.medicalSchoolCountry,
    graduation_year: data.graduationYear,
    honors: data.honors || [],
    residency: data.residency || [],
    fellowships: data.fellowships || [],
    google_scholar_url: data.googleScholarUrl,
    publications: data.publications || [],
    presentations: data.presentations || [],
    books: data.books || [],
    current_institutions: data.currentInstitutions || [],
    website_url: data.websiteUrl,
    twitter_url: data.twitterUrl,
    researchgate_url: data.researchgateUrl,
    academia_edu_url: data.academiaEduUrl,
    available_days: data.availableDays || [],
    available_hours_start: data.availableHoursStart,
    available_hours_end: data.availableHoursEnd,
    timezone: data.timezone,
    languages: data.languages,
    verification_status: 'pending',
    onboarding_completed_at: new Date().toISOString(),
    onboarding_language: data.onboardingLanguage,
  };
}

/**
 * Create a new physician profile via API route
 * Uses server-side service role to bypass RLS
 */
export async function createPhysicianProfile(
  data: PhysicianProfileData
): Promise<{ success: boolean; physicianId?: string; error?: string }> {
  try {
    const response = await fetch('/api/physicians/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Error creating physician profile:', result.error);
      return { success: false, error: result.error || 'Failed to create profile' };
    }

    return { success: true, physicianId: result.physicianId };
  } catch (err) {
    console.error('Exception creating physician profile:', err);
    return { success: false, error: 'Failed to create profile' };
  }
}

/**
 * Check if email already exists
 */
export async function checkPhysicianEmailExists(
  email: string
): Promise<boolean> {
  try {
    if (!supabase) {
      return false;
    }

    const { data, error } = await supabase
      .from('physicians')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking email:', error);
      return false;
    }

    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Log an audit entry for the onboarding process
 */
export async function logOnboardingAudit(
  entry: {
    physicianId?: string;
    email: string;
    action: 'started' | 'phase_completed' | 'completed' | 'abandoned';
    phase?: string;
    dataSnapshot?: Record<string, unknown>;
    language: string;
  }
): Promise<void> {
  try {
    if (!supabase) {
      console.warn('Supabase not configured, skipping audit log');
      return;
    }

    await supabase.from('physician_onboarding_audit').insert({
      physician_id: entry.physicianId,
      email: entry.email.toLowerCase(),
      action: entry.action,
      phase: entry.phase,
      data_snapshot: entry.dataSnapshot,
      language: entry.language,
      // Note: ip_address and user_agent would be captured server-side
    });
  } catch (err) {
    console.error('Failed to log onboarding audit:', err);
    // Don't throw - audit logging shouldn't block the user
  }
}

/**
 * Update a physician profile (for edits during onboarding)
 */
export async function updatePhysicianProfile(
  physicianId: string,
  data: Partial<PhysicianProfileData>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    const updates: Record<string, unknown> = {};

    // Only include fields that are provided
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.email !== undefined) updates.email = data.email;
    if (data.photoUrl !== undefined) updates.photo_url = data.photoUrl;
    if (data.linkedinUrl !== undefined) updates.linkedin_url = data.linkedinUrl;
    if (data.licenses !== undefined) updates.licenses = data.licenses;
    if (data.primarySpecialty !== undefined) updates.primary_specialty = data.primarySpecialty;
    if (data.subSpecialties !== undefined) updates.sub_specialties = data.subSpecialties;
    if (data.boardCertifications !== undefined) updates.board_certifications = data.boardCertifications;
    if (data.medicalSchool !== undefined) updates.medical_school = data.medicalSchool;
    if (data.medicalSchoolCountry !== undefined) updates.medical_school_country = data.medicalSchoolCountry;
    if (data.graduationYear !== undefined) updates.graduation_year = data.graduationYear;
    if (data.honors !== undefined) updates.honors = data.honors;
    if (data.residency !== undefined) updates.residency = data.residency;
    if (data.fellowships !== undefined) updates.fellowships = data.fellowships;
    if (data.googleScholarUrl !== undefined) updates.google_scholar_url = data.googleScholarUrl;
    if (data.publications !== undefined) updates.publications = data.publications;
    if (data.presentations !== undefined) updates.presentations = data.presentations;
    if (data.books !== undefined) updates.books = data.books;
    if (data.currentInstitutions !== undefined) updates.current_institutions = data.currentInstitutions;
    if (data.websiteUrl !== undefined) updates.website_url = data.websiteUrl;
    if (data.twitterUrl !== undefined) updates.twitter_url = data.twitterUrl;
    if (data.researchgateUrl !== undefined) updates.researchgate_url = data.researchgateUrl;
    if (data.academiaEduUrl !== undefined) updates.academia_edu_url = data.academiaEduUrl;
    if (data.availableDays !== undefined) updates.available_days = data.availableDays;
    if (data.availableHoursStart !== undefined) updates.available_hours_start = data.availableHoursStart;
    if (data.availableHoursEnd !== undefined) updates.available_hours_end = data.availableHoursEnd;
    if (data.timezone !== undefined) updates.timezone = data.timezone;
    if (data.languages !== undefined) updates.languages = data.languages;

    const { error } = await supabase
      .from('physicians')
      .update(updates)
      .eq('id', physicianId);

    if (error) {
      console.error('Error updating physician profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception updating physician profile:', err);
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Get a physician profile by ID
 */
export async function getPhysicianProfile(
  physicianId: string
): Promise<PhysicianProfileData | null> {
  try {
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('physicians')
      .select('*')
      .eq('id', physicianId)
      .single();

    if (error || !data) {
      return null;
    }

    // Convert snake_case back to camelCase
    return {
      fullName: data.full_name,
      email: data.email,
      bio: data.bio,
      photoUrl: data.photo_url,
      linkedinUrl: data.linkedin_url,
      linkedinImported: data.linkedin_imported,
      licenses: data.licenses,
      primarySpecialty: data.primary_specialty,
      subSpecialties: data.sub_specialties,
      boardCertifications: data.board_certifications,
      medicalSchool: data.medical_school,
      medicalSchoolCountry: data.medical_school_country,
      graduationYear: data.graduation_year,
      honors: data.honors,
      residency: data.residency,
      fellowships: data.fellowships,
      googleScholarUrl: data.google_scholar_url,
      publications: data.publications,
      presentations: data.presentations,
      books: data.books,
      currentInstitutions: data.current_institutions,
      websiteUrl: data.website_url,
      twitterUrl: data.twitter_url,
      researchgateUrl: data.researchgate_url,
      academiaEduUrl: data.academia_edu_url,
      availableDays: data.available_days,
      availableHoursStart: data.available_hours_start,
      availableHoursEnd: data.available_hours_end,
      timezone: data.timezone,
      languages: data.languages,
      onboardingLanguage: data.onboarding_language,
    };
  } catch {
    return null;
  }
}

/**
 * Physician consent data for network agreement
 */
export interface PhysicianConsentRecord {
  physicianId: string;
  language: string;
  sections: Record<string, boolean>;
  recordingConsent: boolean | null;
  signedAt: string;
  formVersion: string;
}

/**
 * Save physician consent record via server-side API route
 */
export async function savePhysicianConsent(
  consent: PhysicianConsentRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/consent/physician-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        physicianId: consent.physicianId,
        formType: 'network_agreement',
        formVersion: consent.formVersion,
        language: consent.language,
        sections: consent.sections,
        recordingConsent: consent.recordingConsent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to save physician consent:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err) {
    console.error('Consent save error:', err);
    return { success: false, error: 'Failed to save consent' };
  }
}

/**
 * Check if physician has valid consent
 */
export async function hasValidPhysicianConsent(
  physicianId: string,
  requiredVersion?: string
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    let query = supabase
      .from('physician_consent_records')
      .select('id')
      .eq('physician_id', physicianId)
      .eq('form_type', 'network_agreement')
      .limit(1);

    if (requiredVersion) {
      query = query.eq('form_version', requiredVersion);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to check physician consent:', error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
