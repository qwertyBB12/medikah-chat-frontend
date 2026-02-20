import { supabaseAdmin } from './supabaseServer';
import { BioInput, BioOutput, generateBioAndTagline } from './bioTemplates';
import { polishBio } from './bioPolisher';

interface PhysicianRow {
  id: string;
  full_name: string;
  primary_specialty?: string | null;
  sub_specialties?: string[] | null;
  medical_school?: string | null;
  medical_school_country?: string | null;
  graduation_year?: number | null;
  board_certifications?: { board: string; certification: string; year?: number }[] | null;
  residency?: { institution: string; specialty: string }[] | null;
  fellowships?: { institution: string; specialty: string }[] | null;
  current_institutions?: string[] | null;
  languages?: string[] | null;
}

interface PhysicianWebsiteRow {
  custom_tagline?: string | null;
  communication_style?: 'thorough' | 'collaborative' | 'direct' | 'reassuring' | null;
  first_consult_expectation?: string | null;
  specialty_motivation?: string | null;
  care_values?: string | null;
  origin_sentence?: string | null;
  personal_statement?: string | null;
  personal_interests?: string | null;
}

function arrayOrEmpty<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

export async function generateBioForPhysician(physicianId: string): Promise<BioOutput> {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }

  const { data: physician, error: physicianError } = await supabaseAdmin
    .from('physicians')
    .select('id, full_name, primary_specialty, sub_specialties, medical_school, medical_school_country, graduation_year, board_certifications, residency, fellowships, current_institutions, languages')
    .eq('id', physicianId)
    .single<PhysicianRow>();

  if (physicianError || !physician) {
    throw new Error('Physician not found');
  }

  const { data: websiteData, error: websiteError } = await supabaseAdmin
    .from('physician_website')
    .select('custom_tagline, communication_style, first_consult_expectation, specialty_motivation, care_values, origin_sentence, personal_statement, personal_interests')
    .eq('physician_id', physicianId)
    .maybeSingle<PhysicianWebsiteRow>();

  if (websiteError) {
    throw new Error('Failed to fetch physician website data');
  }

  const input: BioInput = {
    fullName: physician.full_name,
    primarySpecialty: physician.primary_specialty || undefined,
    subSpecialties: arrayOrEmpty(physician.sub_specialties),
    medicalSchool: physician.medical_school || undefined,
    medicalSchoolCountry: physician.medical_school_country || undefined,
    graduationYear: physician.graduation_year || undefined,
    boardCertifications: arrayOrEmpty(physician.board_certifications),
    residency: arrayOrEmpty(physician.residency),
    fellowships: arrayOrEmpty(physician.fellowships),
    currentInstitutions: arrayOrEmpty(physician.current_institutions),
    languages: arrayOrEmpty(physician.languages),
    communicationStyle: websiteData?.communication_style || undefined,
    firstConsultExpectation: websiteData?.first_consult_expectation || undefined,
    specialtyMotivation: websiteData?.specialty_motivation || undefined,
    careValues: websiteData?.care_values || undefined,
    originSentence: websiteData?.origin_sentence || undefined,
    personalStatement: websiteData?.personal_statement || undefined,
    personalInterests: websiteData?.personal_interests || undefined,
    customTagline: websiteData?.custom_tagline || undefined,
  };

  const templateOutput = generateBioAndTagline(input);

  // Optional LLM polish pass — skipped silently if OPENAI_API_KEY is not set
  let finalOutput: BioOutput = templateOutput;
  let wasPolished = false;

  // Current: OpenAI  |  Future: swap to ANTHROPIC_API_KEY
  if (process.env.OPENAI_API_KEY) {
    const polished = await polishBio({
      templateBioEn: templateOutput.bioEn,
      templateBioEs: templateOutput.bioEs,
      templateTaglineEn: templateOutput.taglineEn,
      templateTaglineEs: templateOutput.taglineEs,
      physicianName: physician.full_name,
      primarySpecialty: physician.primary_specialty || undefined,
    });

    if (polished.wasPolished) {
      finalOutput = {
        bioEn: polished.polishedBioEn,
        bioEs: polished.polishedBioEs,
        taglineEn: polished.polishedTaglineEn,
        taglineEs: polished.polishedTaglineEs,
      };
      wasPolished = true;
    }
  }

  const nowIso = new Date().toISOString();

  const { error: saveError } = await supabaseAdmin
    .from('physician_website')
    .upsert(
      {
        physician_id: physicianId,
        generated_bio_en: finalOutput.bioEn,
        generated_bio_es: finalOutput.bioEs,
        generated_tagline_en: finalOutput.taglineEn,
        generated_tagline_es: finalOutput.taglineEs,
        narrative_status: 'generated',
        narrative_generated_at: nowIso,
        narrative_polished: wasPolished,
        updated_at: nowIso,
      },
      { onConflict: 'physician_id' }
    );

  if (saveError) {
    throw new Error('Failed to save generated bio content');
  }

  return finalOutput;
}
