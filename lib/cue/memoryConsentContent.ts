/**
 * lib/cue/memoryConsentContent.ts
 * --------------------------------
 * Bilingual (ES primary, EN secondary) copy for Cue's cross-session MEMORY
 * aviso de privacidad (PATCH-03 / CUE-13) and the "What Cue remembers" panel.
 *
 * This is a NEW, Cue-scoped privacy notice under LFPDPPP + NOM-024-SSA3 — NOT a
 * frozen legal file and NOT a BAA/HIPAA artifact. DRAFT for counsel review; it is
 * shown ONCE (versioned: re-shown only when AVISO_VERSION changes), the doctor
 * acknowledges, and Cue's memory activates. Keep it accurate to what is actually
 * built: thin third-person notes about the DOCTOR's practice, PHI-minimized and
 * free-text-redacted before storage; doctor can see/correct/delete anytime.
 */

export interface MemoryConsentCopy {
  eyebrow: string;
  title: string;
  intro: string;
  points: { label: string; text: string }[];
  legal: string;
  approve: string;
  decline: string;
  // "What Cue remembers" management panel
  manageTitle: string;
  manageOpen: string;
  empty: string;
  edit: string;
  save: string;
  cancel: string;
  remove: string;
  removeConfirm: string;
  close: string;
  loadError: string;
}

export const MEMORY_CONSENT: Record<'en' | 'es', MemoryConsentCopy> = {
  es: {
    eyebrow: 'Aviso de privacidad · Memoria de Cue',
    title: 'Cue puede recordarte entre sesiones',
    intro:
      'Para acompañarte mejor, Cue puede guardar notas breves sobre tu práctica y retomarlas la próxima vez que hablen. Tú decides, y siempre tienes el control.',
    points: [
      {
        label: 'Para qué',
        text: 'Mantener continuidad: tu enfoque, tus proyectos y tus pendientes, para no empezar de cero cada vez.',
      },
      {
        label: 'Qué guarda',
        text: 'Notas breves, en tercera persona, sobre TU práctica. Minimiza datos sensibles y depura nombres y contactos antes de guardar. No es un expediente clínico.',
      },
      {
        label: 'Cuánto tiempo',
        text: 'Se conservan mientras uses Cue. Puedes borrarlas cuando quieras y se eliminan de inmediato.',
      },
      {
        label: 'Tu control',
        text: 'Puedes ver, corregir o borrar todo lo que Cue recuerda, en cualquier momento, desde aquí mismo.',
      },
    ],
    legal: 'Conforme a la LFPDPPP y la NOM-024-SSA3. Tus notas viven en la base de datos de Medikah y son tuyas.',
    approve: 'Acepto · activar memoria',
    decline: 'Ahora no',
    manageTitle: 'Lo que Cue recuerda',
    manageOpen: 'Lo que Cue recuerda',
    empty: 'Cue aún no ha guardado nada sobre tu práctica.',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    remove: 'Borrar',
    removeConfirm: '¿Borrar esta nota?',
    close: 'Cerrar',
    loadError: 'No se pudo cargar. Intenta de nuevo.',
  },
  en: {
    eyebrow: 'Privacy notice · Cue memory',
    title: 'Cue can remember you across sessions',
    intro:
      'To work with you better, Cue can keep short notes about your practice and pick them up next time you talk. You decide, and you are always in control.',
    points: [
      {
        label: 'Why',
        text: 'Continuity: your focus, your projects, and your open threads, so you do not start from zero each time.',
      },
      {
        label: 'What it keeps',
        text: 'Short, third-person notes about YOUR practice. It minimizes sensitive data and scrubs names and contacts before saving. It is not a medical record.',
      },
      {
        label: 'How long',
        text: 'Kept while you use Cue. You can delete any of it whenever you want and it is removed immediately.',
      },
      {
        label: 'Your control',
        text: 'You can see, correct, or delete everything Cue remembers, at any time, right here.',
      },
    ],
    legal: 'Under Mexico’s LFPDPPP and NOM-024-SSA3. Your notes live in Medikah’s own database and belong to you.',
    approve: 'I agree · turn on memory',
    decline: 'Not now',
    manageTitle: 'What Cue remembers',
    manageOpen: 'What Cue remembers',
    empty: 'Cue has not saved anything about your practice yet.',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    remove: 'Delete',
    removeConfirm: 'Delete this note?',
    close: 'Close',
    loadError: 'Could not load. Try again.',
  },
};
