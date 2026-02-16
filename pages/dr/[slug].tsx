import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../lib/supabaseServer';
import ProfileLayout from '../../components/physician/profile/ProfileLayout';
import ProfileHero from '../../components/physician/profile/ProfileHero';
import ProfileAbout from '../../components/physician/profile/ProfileAbout';
import SpecialtiesGrid from '../../components/physician/profile/SpecialtiesGrid';
import CredentialsBadges from '../../components/physician/profile/CredentialsBadges';
import ProfilePublications from '../../components/physician/profile/ProfilePublications';
import ProfileAvailability from '../../components/physician/profile/ProfileAvailability';
import ProfileCTA from '../../components/physician/profile/ProfileCTA';

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.?\s+|dra\.?\s+)/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface PhysicianData {
  full_name: string;
  email: string;
  photo_url?: string;
  linkedin_url?: string;
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

interface PhysicianProfilePageProps {
  physician: PhysicianData;
}

export default function PhysicianProfilePage({ physician }: PhysicianProfilePageProps) {
  const router = useRouter();
  const isEs = router.locale === 'es';
  const p = physician;

  const slug = nameToSlug(p.full_name);
  const pageTitle = `Dr. ${p.full_name} - ${p.primary_specialty || (isEs ? 'Médico' : 'Physician')} | Medikah`;
  const pageDescription = isEs
    ? `Perfil profesional de Dr. ${p.full_name}${p.primary_specialty ? `, especialista en ${p.primary_specialty}` : ''}. Miembro verificado de la Red de Médicos de Medikah.`
    : `Professional profile of Dr. ${p.full_name}${p.primary_specialty ? `, specializing in ${p.primary_specialty}` : ''}. Verified member of the Medikah Physician Network.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
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

      <ProfileAbout
        fullName={p.full_name}
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        isEs={isEs}
      />

      <SpecialtiesGrid
        primarySpecialty={p.primary_specialty}
        subSpecialties={p.sub_specialties}
        isEs={isEs}
      />

      <CredentialsBadges
        medicalSchool={p.medical_school}
        medicalSchoolCountry={p.medical_school_country}
        graduationYear={p.graduation_year}
        residency={p.residency}
        fellowships={p.fellowships}
        boardCertifications={p.board_certifications}
        isEs={isEs}
      />

      <ProfilePublications
        publications={p.publications}
        isEs={isEs}
      />

      <ProfileAvailability
        availableDays={p.available_days}
        availableHoursStart={p.available_hours_start}
        availableHoursEnd={p.available_hours_end}
        timezone={p.timezone}
        languages={p.languages}
        currentInstitutions={p.current_institutions}
        isEs={isEs}
      />

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
      .select('*')
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

    return {
      props: {
        physician: {
          full_name: physician.full_name,
          email: physician.email,
          photo_url: physician.photo_url || null,
          linkedin_url: physician.linkedin_url || null,
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
      },
    };
  } catch {
    return { notFound: true };
  }
};
