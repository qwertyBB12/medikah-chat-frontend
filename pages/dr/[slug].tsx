import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../lib/supabaseServer';
import { nameToSlug } from '../../lib/slug';
import { normalizeVisibility } from '../../lib/visibilityTypes';
import { derivePublicProfile } from '../../lib/publicProfileDerive';
import type {
  DeriveSpecialtyRow,
  DeriveEducationRow,
} from '../../lib/publicProfileDerive';
import { buildOGImageURL, ogBaseURL } from '../../lib/og-meta';
import ProfileLayout from '../../components/physician/profile/ProfileLayout';
import ProfileHero from '../../components/physician/profile/ProfileHero';
import ProfileAbout from '../../components/physician/profile/ProfileAbout';
import ProfileHighlights from '../../components/physician/profile/ProfileHighlights';
import SpecialtiesGrid from '../../components/physician/profile/SpecialtiesGrid';
import CredentialsBadges from '../../components/physician/profile/CredentialsBadges';
import ProfilePublications from '../../components/physician/profile/ProfilePublications';
import ProfileAvailability from '../../components/physician/profile/ProfileAvailability';
import ProfileCTA from '../../components/physician/profile/ProfileCTA';
import WebsitePracticePhilosophy from '../../components/physician/profile/WebsitePracticePhilosophy';
import WebsiteServices from '../../components/physician/profile/WebsiteServices';
import WebsiteFAQ from '../../components/physician/profile/WebsiteFAQ';
import WebsiteLocation from '../../components/physician/profile/WebsiteLocation';
import CurveDivider from '../../components/landing/CurveDivider';

interface PhysicianData {
  full_name: string;
  title?: 'Dr' | 'Dra' | null;
  photo_url?: string;
  linkedin_url?: string;
  bio?: string;
  primary_specialty?: string;
  sub_specialties?: string[];
  board_certifications?: { board: string; certification: string; year?: number }[];
  medical_school?: string;
  medical_school_country?: string;
  graduation_year?: number;
  honors?: string[];
  residency?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  fellowships?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  publications?: { title: string; journal?: string; year?: number; url?: string }[];
  current_institutions?: string[];
  available_days?: string[];
  available_hours_start?: string;
  available_hours_end?: string;
  timezone?: string;
  languages?: string[];
  licenses?: { country: string; countryCode: string; type: string; number: string }[];
  verification_status: string;
}

interface WebsiteData {
  practice_philosophy?: string;
  value_pillars?: { title: string; description: string }[];
  services?: { title: string; description: string; icon?: string }[];
  faqs?: { question: string; answer: string }[];
  office_address?: string;
  office_city?: string;
  office_country?: string;
  office_phone?: string;
  office_email?: string;
  appointment_url?: string;
  custom_tagline?: string;
  communication_style?: 'thorough' | 'collaborative' | 'direct' | 'reassuring' | null;
  first_consult_expectation?: string;
  narrative_status?: 'pending' | 'collected' | 'generated' | 'approved' | null;
  approved_bio_en?: string;
  approved_bio_es?: string;
  approved_tagline_en?: string;
  approved_tagline_es?: string;
  generated_bio_en?: string;
  generated_bio_es?: string;
  generated_tagline_en?: string;
  generated_tagline_es?: string;
}

interface PhysicianProfilePageProps {
  physician: PhysicianData;
  website: WebsiteData | null;
}

export default function PhysicianProfilePage({ physician, website }: PhysicianProfilePageProps) {
  const router = useRouter();
  const isEs = router.locale === 'es';
  const p = physician;
  const w = website;
  const tagline = w?.custom_tagline
    || (isEs ? w?.approved_tagline_es : w?.approved_tagline_en)
    || undefined;

  // Honorific from the physician's chosen title (Dr/Dra matters in Mexico —
  // never guess gender). Falls back to "Dr." only when no title is set.
  const honorific = p.title ? `${p.title}.` : 'Dr.';

  const slug = nameToSlug(p.full_name);
  const ogImage = buildOGImageURL(ogBaseURL(), {
    surface: 'physician',
    locale: isEs ? 'es' : 'en',
    physicianName: `${honorific} ${p.full_name}`,
    physicianSpecialty: p.primary_specialty,
  });
  const pageTitle = `${honorific} ${p.full_name} - ${p.primary_specialty || (isEs ? 'Médico' : 'Physician')} | Medikah`;
  const pageDescription = isEs
    ? `Perfil profesional de ${honorific} ${p.full_name}${p.primary_specialty ? `, especialista en ${p.primary_specialty}` : ''}. Miembro verificado de la Red de Médicos de Medikah.`
    : `Professional profile of ${honorific} ${p.full_name}${p.primary_specialty ? `, specializing in ${p.primary_specialty}` : ''}. Verified member of the Medikah Physician Network.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': w ? ['Physician', 'MedicalBusiness'] : 'Physician',
    name: `${honorific} ${p.full_name}`,
    url: `https://medikah.health/dr/${slug}`,
    ...(p.photo_url && { image: p.photo_url }),
    ...(p.primary_specialty && { medicalSpecialty: p.primary_specialty }),
    ...(p.medical_school && {
      alumniOf: {
        '@type': 'EducationalOrganization',
        name: p.medical_school,
      },
    }),
    ...(p.current_institutions && p.current_institutions.length > 0 && {
      worksFor: p.current_institutions.map((inst) => ({
        '@type': 'MedicalOrganization',
        name: inst,
      })),
    }),
    ...(p.languages && p.languages.length > 0 && {
      knowsLanguage: p.languages,
    }),
    memberOf: {
      '@type': 'MedicalOrganization',
      name: 'Medikah Physician Network',
      url: 'https://medikah.health',
    },
    ...(w?.office_address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: w.office_address,
        addressLocality: w.office_city,
        addressCountry: w.office_country,
      },
    }),
    ...(w?.office_phone && { telephone: w.office_phone }),
    ...(w?.office_email && { email: w.office_email }),
    ...(w?.appointment_url && { url: w.appointment_url }),
  };

  function handleScheduleClick() {
    router.push('/chat');
  }

  return (
    <ProfileLayout title={pageTitle} description={pageDescription} jsonLd={jsonLd} ogImage={ogImage}>
      <ProfileHero
        fullName={p.full_name}
        honorific={honorific}
        photoUrl={p.photo_url}
        primarySpecialty={p.primary_specialty}
        languages={p.languages}
        timezone={p.timezone}
        tagline={tagline}
        isEs={isEs}
        onScheduleClick={handleScheduleClick}
      />

      {/* Dark hero → Linen about */}
      <CurveDivider from="#0D1520" bg="#F0EAE0" />

      <ProfileAbout
        fullName={p.full_name}
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        bio={p.bio}
        approvedBioEn={w?.approved_bio_en}
        approvedBioEs={w?.approved_bio_es}
        generatedBioEn={w?.narrative_status === 'approved' ? w?.generated_bio_en : undefined}
        generatedBioEs={w?.narrative_status === 'approved' ? w?.generated_bio_es : undefined}
        narrativeStatus={w?.narrative_status}
        isEs={isEs}
      />

      <ProfileHighlights
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        communicationStyle={w?.communication_style ?? undefined}
        firstConsultExpectation={w?.first_consult_expectation ?? undefined}
        currentInstitutions={p.current_institutions}
        boardCertifications={p.board_certifications}
        isEs={isEs}
      />

      {w && (
        <WebsitePracticePhilosophy
          practicePhilosophy={w.practice_philosophy}
          valuePillars={w.value_pillars}
          isEs={isEs}
        />
      )}

      {/* Linen narrative → Dark credentials */}
      <CurveDivider from="#E8E0D5" bg="#1B2A41" flip />

      <CredentialsBadges
        medicalSchool={p.medical_school}
        medicalSchoolCountry={p.medical_school_country}
        graduationYear={p.graduation_year}
        residency={p.residency}
        fellowships={p.fellowships}
        boardCertifications={p.board_certifications}
        isEs={isEs}
      />

      <SpecialtiesGrid
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        isEs={isEs}
      />

      {/* Professional section → Linen services/publications */}
      <CurveDivider from="#1B2A41" bg="#F0EAE0" />

      {w && (
        <WebsiteServices
          services={w.services}
          isEs={isEs}
        />
      )}

      <ProfilePublications
        publications={p.publications}
        isEs={isEs}
      />

      {w && (
        <WebsiteFAQ
          faqs={w.faqs}
          isEs={isEs}
        />
      )}

      <ProfileAvailability
        availableDays={p.available_days}
        availableHoursStart={p.available_hours_start}
        availableHoursEnd={p.available_hours_end}
        timezone={p.timezone}
        languages={p.languages}
        currentInstitutions={p.current_institutions}
        isEs={isEs}
      />

      {w && (
        <WebsiteLocation
          officeAddress={w.office_address}
          officeCity={w.office_city}
          officeCountry={w.office_country}
          officePhone={w.office_phone}
          officeEmail={w.office_email}
          appointmentUrl={w.appointment_url}
          isEs={isEs}
        />
      )}

      {/* Linen → Dark CTA */}
      <CurveDivider from="#F0EAE0" bg="#1B2A41" flip />

      <ProfileCTA
        fullName={p.full_name}
        timezone={p.timezone}
        languages={p.languages}
        availableHoursStart={p.available_hours_start}
        availableHoursEnd={p.available_hours_end}
        isEs={isEs}
        onScheduleClick={handleScheduleClick}
      />
    </ProfileLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;

  if (!slug || !supabaseAdmin) {
    return { notFound: true };
  }

  try {
    const { data: physicians, error } = await supabaseAdmin
      .from('physicians')
      .select('id, full_name, title, photo_url, photo_thumb_url, linkedin_url, bio, primary_specialty, sub_specialties, board_certifications, medical_school, medical_school_country, graduation_year, honors, residency, fellowships, publications, current_institutions, available_days, available_hours_start, available_hours_end, timezone, languages, licenses, verification_status')
      .eq('verification_status', 'verified');

    if (error || !physicians) {
      return { notFound: true };
    }

    const physician = physicians.find(
      (p: { full_name: string }) => nameToSlug(p.full_name) === slug
    );

    if (!physician) {
      return { notFound: true };
    }

    // Derive-at-read (Phase B2): the public page reads canonical specialty +
    // education and the per-field visibility toggles, instead of the flat
    // physicians columns. A field shows iff its toggle is on AND the underlying
    // row is verified (spec §5). Board certifications stay flat for now (no
    // canonical board-cert store yet) and are gated by the certifications toggle
    // only. Contact (physician_website office_*) is self-declared, not a
    // credential, so it is gated by its toggle alone.
    //
    // No-regression: an already-verified physician had their specialty/education
    // backfilled as verified (migrations 033/035) and every toggle defaults on,
    // so the derived output is identical to the prior flat-column render.
    const [
      { data: websiteData },
      { data: specialtyRows },
      { data: educationRows },
      { data: visibilityRow },
    ] = await Promise.all([
      supabaseAdmin
        .from('physician_website')
        .select('*')
        .eq('physician_id', physician.id)
        .eq('enabled', true)
        .maybeSingle(),
      supabaseAdmin
        .from('physician_specialties')
        .select('name, role, verification_status')
        .eq('physician_id', physician.id),
      supabaseAdmin
        .from('physician_education')
        .select('kind, institution, country, specialty, start_year, end_year, verification_status')
        .eq('physician_id', physician.id),
      supabaseAdmin
        .from('physician_profile_visibility')
        .select('toggles')
        .eq('physician_id', physician.id)
        .maybeSingle(),
    ]);

    const toggles = normalizeVisibility(visibilityRow?.toggles);

    const derived = derivePublicProfile({
      specialties: (specialtyRows || []) as DeriveSpecialtyRow[],
      education: (educationRows || []) as DeriveEducationRow[],
      toggles,
      flatBoardCertifications: physician.board_certifications || [],
    });

    // Contact (self-declared website fields, gated by toggle only)
    const showAddress = toggles.officeAddress && !!websiteData;

    return {
      props: {
        physician: {
          full_name: physician.full_name,
          title: physician.title || null,
          photo_url: physician.photo_url || null,
          linkedin_url: physician.linkedin_url || null,
          bio: physician.bio || null,
          primary_specialty: derived.primarySpecialty,
          sub_specialties: derived.subSpecialties,
          board_certifications: derived.boardCertifications,
          medical_school: derived.medicalSchool,
          medical_school_country: derived.medicalSchoolCountry,
          graduation_year: derived.graduationYear,
          honors: physician.honors || [],
          residency: derived.residency,
          fellowships: derived.fellowships,
          publications: physician.publications || [],
          current_institutions: physician.current_institutions || [],
          available_days: physician.available_days || [],
          available_hours_start: physician.available_hours_start || null,
          available_hours_end: physician.available_hours_end || null,
          timezone: physician.timezone || null,
          languages: physician.languages || [],
          licenses: physician.licenses || [],
          verification_status: physician.verification_status,
        },
        website: websiteData ? {
          practice_philosophy: websiteData.practice_philosophy || null,
          value_pillars: websiteData.value_pillars || [],
          services: websiteData.services || [],
          faqs: websiteData.faqs || [],
          office_address: showAddress ? websiteData.office_address || null : null,
          office_city: showAddress ? websiteData.office_city || null : null,
          office_country: showAddress ? websiteData.office_country || null : null,
          office_phone: toggles.phone ? websiteData.office_phone || null : null,
          office_email: toggles.officeEmail ? websiteData.office_email || null : null,
          appointment_url: toggles.appointmentUrl ? websiteData.appointment_url || null : null,
          custom_tagline: websiteData.custom_tagline || null,
          communication_style: websiteData.communication_style || null,
          first_consult_expectation: websiteData.first_consult_expectation || null,
          narrative_status: websiteData.narrative_status || null,
          approved_bio_en: websiteData.approved_bio_en || null,
          approved_bio_es: websiteData.approved_bio_es || null,
          approved_tagline_en: websiteData.approved_tagline_en || null,
          approved_tagline_es: websiteData.approved_tagline_es || null,
          generated_bio_en: websiteData.generated_bio_en || null,
          generated_bio_es: websiteData.generated_bio_es || null,
          generated_tagline_en: websiteData.generated_tagline_en || null,
          generated_tagline_es: websiteData.generated_tagline_es || null,
        } : null,
      },
    };
  } catch {
    return { notFound: true };
  }
};
