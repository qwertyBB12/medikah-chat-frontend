import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../lib/supabaseServer';
import { nameToSlug } from '../../lib/slug';
import ProfileLayout from '../../components/physician/profile/ProfileLayout';
import ProfileHero from '../../components/physician/profile/ProfileHero';
import ProfileAbout from '../../components/physician/profile/ProfileAbout';
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

  const slug = nameToSlug(p.full_name);
  const pageTitle = `Dr. ${p.full_name} - ${p.primary_specialty || (isEs ? 'Médico' : 'Physician')} | Medikah`;
  const pageDescription = isEs
    ? `Perfil profesional de Dr. ${p.full_name}${p.primary_specialty ? `, especialista en ${p.primary_specialty}` : ''}. Miembro verificado de la Red de Médicos de Medikah.`
    : `Professional profile of Dr. ${p.full_name}${p.primary_specialty ? `, specializing in ${p.primary_specialty}` : ''}. Verified member of the Medikah Physician Network.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': w ? ['Physician', 'MedicalBusiness'] : 'Physician',
    name: `Dr. ${p.full_name}`,
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
    <ProfileLayout title={pageTitle} description={pageDescription} jsonLd={jsonLd}>
      <ProfileHero
        fullName={p.full_name}
        photoUrl={p.photo_url}
        primarySpecialty={p.primary_specialty}
        boardCertifications={p.board_certifications}
        currentInstitutions={p.current_institutions}
        languages={p.languages}
        timezone={p.timezone}
        licenses={p.licenses}
        isEs={isEs}
        onScheduleClick={handleScheduleClick}
      />

      {/* Dark hero → White about */}
      <CurveDivider from="#1B2A41" bg="#FFFFFF" />

      <ProfileAbout
        fullName={p.full_name}
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        bio={p.bio}
        isEs={isEs}
      />

      {w && (
        <WebsitePracticePhilosophy
          practicePhilosophy={w.practice_philosophy}
          valuePillars={w.value_pillars}
          isEs={isEs}
        />
      )}

      <SpecialtiesGrid
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        isEs={isEs}
      />

      {/* Linen specialties → Dark credentials */}
      <CurveDivider from="#F0EAE0" bg="#1B2A41" />

      <CredentialsBadges
        medicalSchool={p.medical_school}
        medicalSchoolCountry={p.medical_school_country}
        graduationYear={p.graduation_year}
        residency={p.residency}
        fellowships={p.fellowships}
        boardCertifications={p.board_certifications}
        isEs={isEs}
      />

      {/* Dark credentials → White services/publications */}
      <CurveDivider from="#1B2A41" bg="#FFFFFF" />

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

      {/* White/linen → Dark CTA */}
      <CurveDivider from="#FFFFFF" bg="#1B2A41" />

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
      .select('id, full_name, photo_url, linkedin_url, bio, primary_specialty, sub_specialties, board_certifications, medical_school, medical_school_country, graduation_year, honors, residency, fellowships, publications, current_institutions, available_days, available_hours_start, available_hours_end, timezone, languages, licenses, verification_status')
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

    // Fetch website data if it exists and is enabled
    const { data: websiteData } = await supabaseAdmin
      .from('physician_website')
      .select('*')
      .eq('physician_id', physician.id)
      .eq('enabled', true)
      .maybeSingle();

    return {
      props: {
        physician: {
          full_name: physician.full_name,
          photo_url: physician.photo_url || null,
          linkedin_url: physician.linkedin_url || null,
          bio: physician.bio || null,
          primary_specialty: physician.primary_specialty || null,
          sub_specialties: physician.sub_specialties || [],
          board_certifications: physician.board_certifications || [],
          medical_school: physician.medical_school || null,
          medical_school_country: physician.medical_school_country || null,
          graduation_year: physician.graduation_year || null,
          honors: physician.honors || [],
          residency: physician.residency || [],
          fellowships: physician.fellowships || [],
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
          office_address: websiteData.office_address || null,
          office_city: websiteData.office_city || null,
          office_country: websiteData.office_country || null,
          office_phone: websiteData.office_phone || null,
          office_email: websiteData.office_email || null,
          appointment_url: websiteData.appointment_url || null,
          custom_tagline: websiteData.custom_tagline || null,
        } : null,
      },
    };
  } catch {
    return { notFound: true };
  }
};
