/**
 * EditorialLayout.tsx — Personality-forward Substack-like layout (D-15)
 *
 * Visual archetype: small square-photo hero → BIG practice philosophy (60% viewport,
 * DM Serif, generous line-height) → full-width prose bio → photo gallery moments →
 * highlights pull-quote style → compact services list (not grid) → FAQ →
 * location TEXT-ONLY (no map) → CTA.
 *
 * Orientation: personality-first. The physician's voice and philosophy dominate.
 * Suitable for physicians with strong narrative bios, philosophy statements,
 * or an editorial presence (think Substack author profile).
 *
 * Key differentiators from Classic:
 *  - Philosophy section leads (after hero), not supports
 *  - Photo displayed as small square (personality) not full-bleed (authority)
 *  - Services as compact list (not 3-col grid)
 *  - Location is text-only — no map card (matches editorial lean aesthetic)
 *  - "Moments" gallery placeholder for office_photo_urls (12-05 wires the full gallery)
 */

import Image from 'next/image';
import { useRouter } from 'next/router';
import ProfileAbout from '../../profile/ProfileAbout';
import ProfileHighlights from '../../profile/ProfileHighlights';
import WebsitePracticePhilosophy from '../../profile/WebsitePracticePhilosophy';
import WebsiteServices from '../../profile/WebsiteServices';
import WebsiteFAQ from '../../profile/WebsiteFAQ';
import ProfileCTA from '../../profile/ProfileCTA';
import CredentialsBadges from '../../profile/CredentialsBadges';
import SpecialtiesGrid from '../../profile/SpecialtiesGrid';
import TryProContactForm from '../sections/TryProContactForm';
import StateLicensureDisclaimer from '../sections/StateLicensureDisclaimer';
import type { PracikahTheme } from '../../../../lib/practikahTheme';
import type { LayoutProps } from './ClassicLayout';

export default function EditorialLayout({ physician, website, theme, isEs, slug }: LayoutProps) {
  const router = useRouter();
  const accent = theme.accent_color;
  const p = physician;
  const w = website;

  function handleScheduleClick() {
    router.push('/chat');
  }

  const tagline = w?.custom_tagline
    || (isEs ? w?.approved_tagline_es : w?.approved_tagline_en)
    || undefined;

  return (
    <div className="w-full">
      {/*
       * 1. Small editorial hero — square photo + name only, no service tags.
       *    Intentionally compact — the philosophy section below is the visual centerpiece.
       *    This is the sharpest differentiator from Classic's full-bleed hero.
       */}
      <section
        className="px-6 py-16 md:py-24"
        style={{ background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)' }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-8">
          {/* Square photo — editorial portrait style */}
          {p.photo_url ? (
            <div className="flex-shrink-0">
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-md overflow-hidden ring-2 ring-white/20">
                <Image
                  src={p.photo_url}
                  alt={p.full_name}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              </div>
            </div>
          ) : (
            <div
              className="flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${accent}22` }}
            >
              <span
                className="font-heading text-3xl uppercase"
                style={{ color: accent }}
              >
                {p.full_name.charAt(0)}
              </span>
            </div>
          )}

          {/* Name + specialty — minimal, no CTA button in hero */}
          <div className="text-center sm:text-left">
            <div
              className="flex items-center gap-3 mb-4 justify-center sm:justify-start"
            >
              <div className="w-8 h-px" style={{ backgroundColor: accent }} />
              <span
                className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                {p.primary_specialty || (isEs ? 'Médico' : 'Physician')}
              </span>
            </div>
            <h1 className="font-heading text-[clamp(2rem,5vw,3rem)] font-medium uppercase tracking-[-0.02em] leading-[0.95] text-white mb-3">
              {p.full_name}
            </h1>
            {tagline && (
              <p className="font-body text-white/60 text-lg italic">{tagline}</p>
            )}
            {p.languages && p.languages.length > 0 && (
              <p className="mt-3 font-body text-sm text-white/40">{p.languages.join(' · ')}</p>
            )}
          </div>
        </div>
      </section>

      {/*
       * 2. Practice Philosophy — BIG, takes visual prominence (editorial-lead).
       *    The existing WebsitePracticePhilosophy component is reused.
       *    Editorial intent: 60% of initial viewport, generous leading.
       *    The surrounding wrapper adds extra vertical space and DM Serif hint.
       */}
      {w && (
        <div className="py-8 bg-linen">
          <WebsitePracticePhilosophy
            practicePhilosophy={w.practice_philosophy ?? undefined}
            valuePillars={w.value_pillars}
            isEs={isEs}
          />
        </div>
      )}

      {/*
       * 3. Full-width prose bio — the physician's personal narrative.
       *    In Editorial, this is full-width prose, not constrained to 75ch.
       *    ProfileAbout already renders a generous max-w-[75ch] by default.
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
       * 4. "Moments" photo gallery — office_photo_urls in 2-col masonry style.
       *    Full gallery component ships in 12-05 with the theming editor.
       *    This plan renders a compact preview strip if photos exist.
       */}
      {theme.office_photo_urls && theme.office_photo_urls.length > 0 && (
        <section className="py-16 bg-linen">
          <div className="max-w-5xl mx-auto px-6 md:px-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-px" style={{ backgroundColor: accent }} />
              <p
                className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                {isEs ? 'Momentos' : 'Moments'}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {theme.office_photo_urls.slice(0, 6).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden">
                  <Image
                    src={url}
                    alt={isEs ? `Foto de consultorio ${i + 1}` : `Office photo ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/*
       * 5. Highlights — rendered pull-quote style (3 highlight cards).
       *    In Editorial, this surfaces specialty/approach/first-visit as succinct copy.
       */}
      <ProfileHighlights
        primarySpecialty={p.primary_specialty ?? undefined}
        subSpecialties={p.sub_specialties}
        communicationStyle={p.communication_style ?? w?.communication_style ?? undefined}
        firstConsultExpectation={p.first_consult_expectation ?? w?.first_consult_expectation ?? undefined}
        currentInstitutions={p.current_institutions}
        boardCertifications={p.board_certifications}
        isEs={isEs}
      />

      {/*
       * 6. Credentials — shown but positioned after the narrative (personality-first order).
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
       * 7. Specialties — shown after credentials (narrative first, structure second).
       */}
      <SpecialtiesGrid
        primarySpecialty={p.primary_specialty ?? undefined}
        subSpecialties={p.sub_specialties}
        isEs={isEs}
      />

      {/*
       * 8. Services — compact list (NOT the 3-col grid from Classic).
       *    WebsiteServices renders as a grid by default; we wrap it with a compact
       *    override div that constrains to max-w-2xl for a list-like feel.
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
       * 9. FAQ — personality-forward editorial includes patient Q&A.
       */}
      {w && (
        <WebsiteFAQ
          faqs={w.faqs}
          isEs={isEs}
        />
      )}

      {/*
       * 10. Location — TEXT ONLY (no map card). Key differentiator from Classic.
       *     In Editorial, location is inline text (city + country) not an address card.
       *     We render a minimal location line rather than WebsiteLocation's card UI.
       */}
      {w && (w.office_city || w.office_country) && (
        <section className="py-12 bg-linen">
          <div className="max-w-3xl mx-auto px-6 md:px-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-px" style={{ backgroundColor: accent }} />
              <p
                className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                {isEs ? 'Ubicación' : 'Location'}
              </p>
            </div>
            <p className="font-body text-body-slate text-lg">
              {[w.office_city, w.office_country].filter(Boolean).join(', ')}
              {w.office_phone && (
                <>
                  {' · '}
                  <a
                    href={`tel:${w.office_phone}`}
                    className="hover:underline"
                    style={{ color: accent }}
                  >
                    {w.office_phone}
                  </a>
                </>
              )}
              {w.office_email && (
                <>
                  {' · '}
                  <a
                    href={`mailto:${w.office_email}`}
                    className="hover:underline"
                    style={{ color: accent }}
                  >
                    {w.office_email}
                  </a>
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {/*
       * 11. CTA — schedule consultation.
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
       * 12. Contact form — WEB-15. Posts to /api/physicians/{id}/inquiries.
       *     Placed after FAQ (last narrative section) per plan spec.
       *     id="contact" anchors the ThemedShell header "Contact" nav link.
       */}
      <TryProContactForm
        physicianId={p.id}
        isEs={isEs}
        accentColor={accent}
      />

      {/*
       * 13. State-licensure disclaimer — WEB-16. Auto-generated bilingually.
       *     Positioned above the footer per Editorial layout spec.
       */}
      <StateLicensureDisclaimer physician={p} isEs={isEs} />
    </div>
  );
}
