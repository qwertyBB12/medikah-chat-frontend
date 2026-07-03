/**
 * MinimalLayout.tsx — Restrained portfolio layout (D-15)
 *
 * Visual archetype: tiny centered hero (name in Oswald uppercase, accent-color
 * thin underline) → about in single-column max-w-2xl mx-auto with py-24 →
 * specialties as text list (no cards) → philosophy single-column with accent
 * quote marks → services as numbered list → location as 1-line address only →
 * single big CTA button.
 *
 * Orientation: whitespace-heavy, restrained, portfolio-grade. Accent color used
 * sparingly — only for the name underline, quote marks, list numbers, and CTA button.
 * Big typography dominates over visual chrome.
 *
 * Key differentiators from Classic and Editorial:
 *  - Centered tiny hero (no photo display option — or tiny monogram)
 *  - No cards — everything is flowing text
 *  - max-w-2xl mx-auto single-column constraint throughout
 *  - Accent used sparingly (underline, punctuation, numbers only)
 *  - Location = 1-line address text, no cards, no map
 *  - Big single CTA button (no secondary links in CTA)
 */

import { useRouter } from 'next/router';
import ProfileAbout from '../../profile/ProfileAbout';
import SpecialtiesGrid from '../../profile/SpecialtiesGrid';
import WebsiteFAQ from '../../profile/WebsiteFAQ';
import CredentialsBadges from '../../profile/CredentialsBadges';
import WebsiteLocation from '../../profile/WebsiteLocation';
import WebsiteServices from '../../profile/WebsiteServices';
import WebsitePracticePhilosophy from '../../profile/WebsitePracticePhilosophy';
import TryProContactForm from '../sections/TryProContactForm';
import StateLicensureDisclaimer from '../sections/StateLicensureDisclaimer';
import type { PracikahTheme } from '../../../../lib/practikahTheme';
import type { LayoutProps } from './ClassicLayout';

export default function MinimalLayout({ physician, website, theme, isEs, slug }: LayoutProps) {
  const router = useRouter();
  const accent = theme.accent_color;
  const p = physician;
  const w = website;

  function handleScheduleClick() {
    router.push('/chat');
  }

  return (
    <div className="w-full bg-white">
      {/*
       * 1. Tiny centered hero.
       *    Name in font-heading uppercase with accent-color thin bottom border underline.
       *    No photo displayed (purely typographic — Max Miedinger / Helvetica poster aesthetic).
       *    Specialty as small uppercase eyebrow.
       */}
      <section className="py-24 md:py-36 text-center px-6">
        <div className="max-w-2xl mx-auto">
          {p.primary_specialty && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-8 h-px" style={{ backgroundColor: accent }} />
              <p
                className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                {p.primary_specialty}
              </p>
              <div className="w-8 h-px" style={{ backgroundColor: accent }} />
            </div>
          )}

          <h1
            className="font-heading text-[clamp(2.5rem,8vw,5rem)] font-medium uppercase tracking-[-0.02em] leading-[0.9] text-deep-charcoal mb-6"
          >
            {p.full_name}
          </h1>

          {/* Accent-color thin underline below the name */}
          <div
            className="mx-auto mb-8 h-[2px] w-16"
            style={{ backgroundColor: accent }}
          />

          {p.languages && p.languages.length > 0 && (
            <p className="font-body text-body-slate text-sm">
              {p.languages.join(' · ')}
            </p>
          )}

          {p.timezone && (
            <p className="font-body text-body-slate/60 text-xs mt-2">
              {p.timezone.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </section>

      {/*
       * 2. About — single column, max-w-2xl mx-auto, generous vertical space.
       *    The py-24 constraint sets the "lots of whitespace" tone.
       */}
      <section className="bg-linen py-4">
        <div className="max-w-2xl mx-auto">
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
        </div>
      </section>

      {/*
       * 3. Specialties — text list, no cards.
       *    SpecialtiesGrid renders cards by default; we replace it with a minimal
       *    text-list for Minimal layout's card-free aesthetic.
       */}
      {(p.primary_specialty || (p.sub_specialties && p.sub_specialties.length > 0)) && (
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-px" style={{ backgroundColor: accent }} />
              <p
                className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                {isEs ? 'Especialidades' : 'Specialties'}
              </p>
            </div>
            <ul className="space-y-3">
              {p.primary_specialty && (
                <li className="font-heading text-lg uppercase tracking-[0.02em] text-deep-charcoal">
                  <span style={{ color: accent }}>—</span>{' '}
                  {p.primary_specialty}
                </li>
              )}
              {p.sub_specialties?.map((sub, i) => (
                <li key={i} className="font-body text-body-slate text-base pl-6">
                  {sub}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/*
       * 4. Practice Philosophy — single-column, accent quote marks.
       *    Constrained to max-w-2xl for minimal single-column aesthetic.
       */}
      {w && (
        <div className="max-w-2xl mx-auto">
          <WebsitePracticePhilosophy
            practicePhilosophy={w.practice_philosophy ?? undefined}
            valuePillars={w.value_pillars}
            isEs={isEs}
          />
        </div>
      )}

      {/*
       * 5. Services — constrained to max-w-2xl for a list-like feel.
       *    WebsiteServices renders its own grid; Minimal constrains the container.
       */}
      {w && (
        <div className="max-w-2xl mx-auto">
          <WebsiteServices
            services={w.services?.slice(0, 4)}
            isEs={isEs}
          />
        </div>
      )}

      {/*
       * 6. Credentials — shown for trust but after the philosophy/services in Minimal.
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
       * 7. FAQ — included for completeness but minimal whitespace treatment.
       */}
      {w && (
        <div className="max-w-2xl mx-auto">
          <WebsiteFAQ
            faqs={w.faqs}
            isEs={isEs}
          />
        </div>
      )}

      {/*
       * 8. Location — 1-line address only (no cards, no map, no contact grid).
       *    Key differentiator from Classic (full card + map) and Editorial (text-only but multi-field).
       *    WebsiteLocation component used; constrained to max-w-2xl for single-column treatment.
       */}
      {w && (
        <div className="max-w-2xl mx-auto">
          <WebsiteLocation
            officeAddress={w.office_address ?? undefined}
            officeCity={w.office_city ?? undefined}
            officeCountry={w.office_country ?? undefined}
            officePhone={w.office_phone ?? undefined}
            officeEmail={w.office_email ?? undefined}
            appointmentUrl={w.appointment_url ?? undefined}
            isEs={isEs}
          />
        </div>
      )}

      {/*
       * 9. Single big CTA button — the only CTA on the page.
       *    Accent color fill, full-width on mobile, centered on desktop.
       */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-heading text-[clamp(2rem,5vw,3rem)] font-medium uppercase tracking-[-0.02em] leading-[0.95] text-deep-charcoal mb-8">
            {isEs
              ? `Agendar con ${p.full_name.split(' ')[0]}`
              : `Schedule with Dr. ${p.full_name.split(' ')[0]}`}
          </h2>
          <button
            onClick={handleScheduleClick}
            className="inline-flex items-center justify-center font-body text-sm font-medium uppercase tracking-[0.04em] px-12 py-4 text-white rounded-md transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
            style={{ backgroundColor: accent }}
          >
            {isEs ? 'Agendar Consulta' : 'Schedule Consultation'}
          </button>
          {(p.available_hours_start || p.languages) && (
            <p className="mt-6 font-body text-xs text-body-slate/50">
              {p.languages?.join(' · ')}
              {p.available_hours_start && p.available_hours_end && (
                <>{' · '}{p.available_hours_start}–{p.available_hours_end}</>
              )}
            </p>
          )}
        </div>
      </section>

      {/*
       * 10. Contact form — WEB-15. Minimal layout: generous margin, single-column.
       *     id="contact" anchors the ThemedShell header "Contact" nav link.
       */}
      <div className="max-w-2xl mx-auto">
        <TryProContactForm
          physicianId={p.id}
          isEs={isEs}
          accentColor={accent}
        />
      </div>

      {/*
       * 11. State-licensure disclaimer — WEB-16. Positioned right before
       *     the final tag-line block (i.e., at the bottom of the page) per spec.
       */}
      <StateLicensureDisclaimer physician={p} isEs={isEs} />
    </div>
  );
}
