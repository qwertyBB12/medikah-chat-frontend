// CDMX talk-series session calendar (June 22–30, 2026 — June 24 dark for
// Mexico–Czechia). Single source of truth shared by the /cdmx page, the
// /api/cdmx-rsvp validator, and the confirmation email.

export const CDMX_MAX_PREFERENCES = 3;

// June 24 intentionally absent (no sessions that day).
const DAYS: { id: string; dayNum: number; weekday: { es: string; en: string } }[] = [
  { id: 'jun22', dayNum: 22, weekday: { es: 'Lun', en: 'Mon' } },
  { id: 'jun23', dayNum: 23, weekday: { es: 'Mar', en: 'Tue' } },
  { id: 'jun25', dayNum: 25, weekday: { es: 'Jue', en: 'Thu' } },
  { id: 'jun26', dayNum: 26, weekday: { es: 'Vie', en: 'Fri' } },
  { id: 'jun27', dayNum: 27, weekday: { es: 'Sáb', en: 'Sat' } },
  { id: 'jun28', dayNum: 28, weekday: { es: 'Dom', en: 'Sun' } },
  { id: 'jun29', dayNum: 29, weekday: { es: 'Lun', en: 'Mon' } },
  { id: 'jun30', dayNum: 30, weekday: { es: 'Mar', en: 'Tue' } },
];

const SLOTS: { id: string; label: string }[] = [
  { id: '0900', label: '9:00 – 12:00' },
  { id: '1300', label: '13:00 – 16:00' },
  { id: '1700', label: '17:00 – 20:00' },
];

export interface CdmxSessionDay {
  id: string;
  dayNum: number;
  weekday: { es: string; en: string };
  slots: { id: string; sessionId: string; label: string }[];
}

export const CDMX_SESSION_DAYS: CdmxSessionDay[] = DAYS.map((d) => ({
  ...d,
  slots: SLOTS.map((s) => ({ id: s.id, sessionId: `${d.id}-${s.id}`, label: s.label })),
}));

export const CDMX_SESSION_IDS: string[] = CDMX_SESSION_DAYS.flatMap((d) =>
  d.slots.map((s) => s.sessionId)
);

const SESSION_LABELS: Record<string, { es: string; en: string }> = {};
for (const d of CDMX_SESSION_DAYS) {
  for (const s of d.slots) {
    SESSION_LABELS[s.sessionId] = {
      es: `${d.weekday.es} ${d.dayNum} de junio · ${s.label}`,
      en: `${d.weekday.en}, June ${d.dayNum} · ${s.label}`,
    };
  }
}

export const cdmxSessionLabel = (sessionId: string, lang: 'es' | 'en'): string =>
  SESSION_LABELS[sessionId]?.[lang] ?? sessionId;

// Validate + normalize a submitted preference list: known ids only, deduped,
// order preserved, capped at CDMX_MAX_PREFERENCES.
export const sanitizeCdmxPreferences = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const id = String(raw);
    if (SESSION_LABELS[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
      if (out.length >= CDMX_MAX_PREFERENCES) break;
    }
  }
  return out;
};
