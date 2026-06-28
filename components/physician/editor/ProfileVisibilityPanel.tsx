/**
 * ProfileVisibilityPanel — Public Profile becomes a visibility layer (Phase B2).
 *
 * Replaces the duplicate SpecialtyEditor + EducationEditor that used to let a
 * physician re-type specialty/education here. Those facts are now edited in the
 * Credentials tab (canonical physician_specialties / physician_education) and the
 * public page /dr/[slug] reads them directly. This panel only lets the physician
 * choose what patients SEE: a read-only preview of each canonical field plus a
 * show/hide toggle. Reminder: a field appears publicly only if its toggle is on
 * AND the underlying credential is verified.
 *
 * Contact-field visibility (office address/phone/email/appointment URL) is left
 * for a follow-up — those toggles default on and are already honored by the
 * public page; their editing still lives in the website settings.
 */
import { useEffect, useState, useCallback } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import type { PhysicianSpecialty } from '../../../lib/specialtyTypes';
import type { PhysicianEducation } from '../../../lib/educationTypes';
import type { ProfileVisibility, VisibilityKey } from '../../../lib/visibilityTypes';
import { DEFAULT_VISIBILITY } from '../../../lib/visibilityTypes';
import { getSpecialties } from '../../../lib/specialtyClient';
import { getEducation } from '../../../lib/educationClient';
import { getVisibility, saveVisibility } from '../../../lib/visibilityClient';

interface ProfileVisibilityPanelProps {
  physicianId: string;
  lang: SupportedLang;
}

const content = {
  en: {
    title: 'What patients see',
    subtitle:
      'Your specialty and education are managed in the Credentials tab. Here you choose what appears on your public profile. A field shows only if it is toggled on and verified.',
    editInCredentials: 'Edit in the Credentials tab',
    specialty: 'Primary specialty',
    subspecialties: 'Subspecialties',
    medicalSchool: 'Medical school',
    residency: 'Residency',
    fellowships: 'Fellowships',
    certifications: 'Board certifications',
    none: 'Not set',
    onlyVerified: 'Only verified items appear publicly.',
    shown: 'Shown',
    hidden: 'Hidden',
    loading: 'Loading...',
    loadError: 'Could not load. Please refresh.',
    verified: 'verified',
    unverified: 'not yet verified',
  },
  es: {
    title: 'Lo que ven los pacientes',
    subtitle:
      'Su especialidad y educacion se gestionan en la pestana de Credenciales. Aqui elige que aparece en su perfil publico. Un campo se muestra solo si esta activado y verificado.',
    editInCredentials: 'Editar en la pestana de Credenciales',
    specialty: 'Especialidad principal',
    subspecialties: 'Subespecialidades',
    medicalSchool: 'Escuela de medicina',
    residency: 'Residencia',
    fellowships: 'Becas / Fellowships',
    certifications: 'Certificaciones de consejo',
    none: 'Sin definir',
    onlyVerified: 'Solo los elementos verificados aparecen publicamente.',
    shown: 'Visible',
    hidden: 'Oculto',
    loading: 'Cargando...',
    loadError: 'No se pudo cargar. Por favor recargue.',
    verified: 'verificado',
    unverified: 'sin verificar',
  },
};

type Lang = keyof typeof content;

function Toggle({ on, onChange, labels }: { on: boolean; onChange: (v: boolean) => void; labels: { shown: string; hidden: string } }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center gap-2 flex-none"
    >
      <span
        className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
          on ? 'bg-clinical-teal' : 'bg-warm-gray-800/[0.2]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            on ? 'translate-x-4' : ''
          }`}
        />
      </span>
      <span className={`font-dm-sans text-xs ${on ? 'text-clinical-teal' : 'text-archival-grey'}`}>
        {on ? labels.shown : labels.hidden}
      </span>
    </button>
  );
}

export default function ProfileVisibilityPanel({ physicianId, lang }: ProfileVisibilityPanelProps) {
  const t = content[lang as Lang];
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [specialties, setSpecialties] = useState<PhysicianSpecialty[]>([]);
  const [education, setEducation] = useState<PhysicianEducation[]>([]);
  const [toggles, setToggles] = useState<ProfileVisibility>(DEFAULT_VISIBILITY);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getSpecialties(physicianId),
      getEducation(physicianId),
      getVisibility(physicianId),
    ]).then(([specRes, eduRes, visRes]) => {
      if (!active) return;
      setLoading(false);
      if (specRes.success && specRes.data) setSpecialties(specRes.data.specialties);
      if (eduRes.success && eduRes.data) setEducation(eduRes.data.education);
      if (visRes.success && visRes.data) setToggles(visRes.data.toggles);
      if (!specRes.success && !eduRes.success && !visRes.success) setLoadError(true);
    });
    return () => {
      active = false;
    };
  }, [physicianId]);

  const setToggle = useCallback(
    (key: VisibilityKey, value: boolean) => {
      setToggles((prev) => {
        const next = { ...prev, [key]: value };
        void saveVisibility(physicianId, next); // optimistic; defaults-on is safe on failure
        return next;
      });
    },
    [physicianId]
  );

  const primary = specialties.find((s) => s.role === 'primary');
  const subs = specialties.filter((s) => s.role === 'subspecialty');
  const medSchool = education.find((e) => e.kind === 'medical_school');
  const residencies = education.filter((e) => e.kind === 'residency');
  const fellowships = education.filter((e) => e.kind === 'fellowship');

  const statusNote = (verified: boolean) =>
    verified ? (
      <span className="text-confirm-green">{t.verified}</span>
    ) : (
      <span className="text-caution-amber">{t.unverified}</span>
    );

  const rows: {
    key: VisibilityKey;
    label: string;
    preview: React.ReactNode;
  }[] = [
    {
      key: 'specialty',
      label: t.specialty,
      preview: primary?.name ? (
        <>
          {primary.name} · {statusNote(primary.verificationStatus === 'verified')}
        </>
      ) : (
        t.none
      ),
    },
    {
      key: 'subspecialties',
      label: t.subspecialties,
      preview: subs.length ? subs.map((s) => s.name).join(', ') : t.none,
    },
    {
      key: 'medicalSchool',
      label: t.medicalSchool,
      preview: medSchool?.institution ? (
        <>
          {medSchool.institution} · {statusNote(medSchool.verificationStatus === 'verified')}
        </>
      ) : (
        t.none
      ),
    },
    {
      key: 'residency',
      label: t.residency,
      preview: residencies.length ? residencies.map((e) => e.institution).join(', ') : t.none,
    },
    {
      key: 'fellowships',
      label: t.fellowships,
      preview: fellowships.length ? fellowships.map((e) => e.institution).join(', ') : t.none,
    },
    {
      key: 'certifications',
      label: t.certifications,
      preview: t.editInCredentials,
    },
  ];

  return (
    <div>
      <h3 className="font-dm-sans font-semibold text-base text-deep-charcoal">{t.title}</h3>
      <p className="font-dm-sans text-sm text-body-slate mt-1 mb-3">{t.subtitle}</p>

      {loading && <p className="font-dm-sans text-sm text-archival-grey">{t.loading}</p>}
      {loadError && <p className="font-dm-sans text-sm text-alert-garnet">{t.loadError}</p>}

      {!loading && !loadError && (
        <div className="divide-y divide-border-line border border-border-line rounded-lg overflow-hidden">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-white"
            >
              <div className="min-w-0">
                <p className="font-dm-sans text-sm font-medium text-deep-charcoal">{row.label}</p>
                <p className="font-dm-sans text-xs text-body-slate truncate">{row.preview}</p>
              </div>
              <Toggle
                on={toggles[row.key]}
                onChange={(v) => setToggle(row.key, v)}
                labels={{ shown: t.shown, hidden: t.hidden }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
