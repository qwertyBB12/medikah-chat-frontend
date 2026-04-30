/**
 * ClassicLayout.tsx — Traditional medical practice layout (D-15)
 *
 * Visual archetype: top hero photo → credentials prominent immediately below hero →
 * specialties grid → services 3-col grid → philosophy centered single-column →
 * FAQ → location card → CTA.
 *
 * Orientation: established, institutional, trust-first. Suitable for physicians
 * emphasizing board certifications, residency training, and practice location.
 *
 * Accent color: all teal-500 references are replaced with var(--accent-color)
 * via inline styles (Tailwind brand classes don't auto-follow CSS vars).
 */

import { useRouter } from 'next/router';
import ProfileHero from '../../profile/ProfileHero';
import ProfileAbout from '../../profile/ProfileAbout';
import CredentialsBadges from '../../profile/CredentialsBadges';
import SpecialtiesGrid from '../../profile/SpecialtiesGrid';
import WebsiteServices from '../../profile/WebsiteServices';
import WebsitePracticePhilosophy from '../../profile/WebsitePracticePhilosophy';
import WebsiteFAQ from '../../profile/WebsiteFAQ';
import WebsiteLocation from '../../profile/WebsiteLocation';
import ProfileCTA from '../../profile/ProfileCTA';
import TryProContactForm from '../sections/TryProContactForm';
import StateLicensureDisclaimer from '../sections/StateLicensureDisclaimer';
import type { PracikahTheme } from '../../../../lib/practikahTheme';

// ---------------------------------------------------------------------------
// Types — mirror the props shape of getServerSideProps in /sites/[slug]
// ---------------------------------------------------------------------------

interface PhysicianRecord {
  id: string;
  full_name: string;
  photo_url?: string | null;
  primary_specialty?: string | null;
  sub_specialties?: string[];
  board_certifications?: { board: string; certification: string; year?: number }[];
  medical_school?: string | null;
  medical_school_country?: string | null;
  graduation_year?: number | null;
  residency?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  fellowships?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  languages?: string[];
  timezone?: string | null;
  available_days?: string[];
  available_hours_start?: string | null;
  available_hours_end?: string | null;
  bio?: string | null;
  publications?: { title: string; journal?: string; year?: number; url?: string }[];
  current_institutions?: string[];
  communication_style?: string | null;
  first_consult_expectation?: string | null;
  // WEB-15 / WEB-16: contact form + licensure disclaimer
  country?: string | null;
  primary_state?: string | null;
  licensed_states?: string[] | null;
  cedula_state?: string | null;
}

interface WebsiteRecord {
  practice_philosophy?: string | null;
  value_pillars?: { title: string; description: string }[];
  services?: { title: string; description: string; icon?: string }[];
  faqs?: { question: string; answer: string }[];
  office_address?: string | null;
  office_city?: string | null;
  office_country?: string | null;
  office_phone?: string | null;
  office_email?: string | null;
  appointment_url?: string | null;
  custom_tagline?: string | null;
  narrative_status?: string | null;
  approved_bio_en?: string | null;
  approved_bio_es?: string | null;
  generated_bio_en?: string | null;
  generated_bio_es?: string | null;
  approved_tagline_en?: string | null;
  approved_tagline_es?: string | null;
  generated_tagline_en?: string | null;
  generated_tagline_es?: string | null;
  communication_style?: string | null;
  first_consult_expectation?: string | null;
}

export interface LayoutProps {
  physician: PhysicianRecord;
  website: WebsiteRecord | null;
  theme: PracikahTheme;
  isEs: boolean;
  slug: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClassicLayout({ physician, website, theme, isEs, slug }: LayoutProps) {
  const router = useRouter();
  const accent = theme.accent_color;
  const p = physician;
  const w = website;

  const tagline = w?.custom_tagline
    || (isEs ? w?.approved_tagline_es : w?.approved_tagline_en)
    || undefined;

  function handleScheduleClick() {
    router.push('/chat');
  }

  return (
    <div className="w-full">
      {/*
       * 1. Full-bleed dark hero with photo — ProfileHero renders against
       *    the brand dark-navy gradient. The accent color is visible in the
       *    eyebrow line and the CTA button style.
       */}
      <ProfileHero
        fullName={p.full_name}
        photoUrl={p.photo_url ?? undefined}
        primarySpecialty={p.primary_specialty ?? undefined}
        languages={p.languages}
        timezone={p.timezone ?? undefined}
        tagline={tagline}
        isEs={isEs}
        onScheduleClick={handleScheduleClick}
      />

      {/*
       * 2. Credentials immediately under hero — Classic emphasizes institutional
       *    trust from the first scroll. The dark-on-dark CredentialsBadges section
       *    continues the navy palette before transitioning to linen.
       */}
      <CredentialsBadges
        medicalSchool={p.medical_school ?? undefined}
        medicalSchoolCountry={p.medical_school_country ?? undefined}
        graduationYear={p.graduation_year ?? undefined}
        residency={p.residency}
        fellowships={p.fellowships}
        boardCertifications={p.board_certifications}
        isEs={isEs}
      />

      {/*
       * 3. Specialties grid — 3-col card layout showing primary + sub-specialties.
       */}
      <SpecialtiesGrid
        primarySpecialty={p.primary_specialty ?? undefined}
        subSpecialties={p.sub_specialties}
        isEs={isEs}
      />

      {/*
       * 4. Services 3-col grid — what the practice offers.
       */}
      {w && (
        <WebsiteServices
          services={w.services}
          isEs={isEs}
        />
      )}

      {/*
       * 5. Practice Philosophy — centered single-column narrative.
       *    Classic treats this as supporting context, not the lead.
       */}
      {w && (
        <WebsitePracticePhilosophy
          practicePhilosophy={w.practice_philosophy ?? undefined}
          valuePillars={w.value_pillars}
          isEs={isEs}
        />
      )}

      {/*
       * 6. About bio — the physician's personal narrative (approved/generated/raw).
       */}
      <ProfileAbout
        fullName={p.full_name}
        primarySpecialty={p.primary_specialty ?? undefined}
        subSpecialties={p.sub_specialties}
        bio={p.bio ?? undefined}
        approvedBioEn={w?.approved_bio_en ?? undefined}
        approvedBioEs={w?.approved_bio_es ?? undefined}
        generatedBioEn={w?.narrative_status === 'approved' ? (w?.generated_bio_en ?? undefined) : undefined}
        generatedBioEs={w?.narrative_status === 'approved' ? (w?.generated_bio_es ?? undefined) : undefined}
        narrativeStatus={(w?.narrative_status as 'pending' | 'collected' | 'generated' | 'approved') ?? null}
        isEs={isEs}
      />

      {/*
       * 7. FAQ — patient questions about the practice.
       */}
      {w && (
        <WebsiteFAQ
          faqs={w.faqs}
          isEs={isEs}
        />
      )}

      {/*
       * 8. Location card — Classic always shows a map embed placeholder and contact details.
       *    This is the key differentiator from Editorial (which is text-only) and
       *    Minimal (which is a 1-line address only).
       */}
      {w && (
        <WebsiteLocation
          officeAddress={w.office_address ?? undefined}
          officeCity={w.office_city ?? undefined}
          officeCountry={w.office_country ?? undefined}
          officePhone={w.office_phone ?? undefined}
          officeEmail={w.office_email ?? undefined}
          appointmentUrl={w.appointment_url ?? undefined}
          isEs={isEs}
        />
      )}

      {/*
       * 9. CTA — schedule consultation. Uses the accent color for the button.
       */}
      <ProfileCTA
        fullName={p.full_name}
        timezone={p.timezone ?? undefined}
        languages={p.languages}
        availableHoursStart={p.available_hours_start ?? undefined}
        availableHoursEnd={p.available_hours_end ?? undefined}
        isEs={isEs}
        onScheduleClick={handleScheduleClick}
      />

      {/*
       * 10. Contact form — WEB-15. Posts to /api/physicians/{id}/inquiries.
       *     Non-PHI disclaimer banner rendered inside the form component.
       *     id="contact" anchors the ThemedShell header "Contact" nav link.
       */}
      <TryProContactForm
        physicianId={p.id}
        isEs={isEs}
        accentColor={accent}
      />

      {/*
       * 11. State-licensure disclaimer — WEB-16. Auto-generated from physician credentials.
       *     Counsel review required before public launch (T-12-06-08).
       */}
      <StateLicensureDisclaimer physician={p} isEs={isEs} />
    </div>
  );
}
