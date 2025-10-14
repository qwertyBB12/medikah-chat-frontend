export type SupportedLang = 'en' | 'es';

interface SchedulerCopy {
  scheduleVisit: string;
  toggleLabel: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  chooseDoctor: string;
  preferredTime: string;
  timeHint: string;
  symptoms: string;
  symptomsPlaceholder: string;
  book: string;
  scheduling: string;
  confirmed: string;
  failed: string;
  doxyLinkLabel: string;
  calendarLinkLabel: string;
  fieldRequired: string;
}

export const i18n: Record<SupportedLang, SchedulerCopy> = {
  en: {
    scheduleVisit: 'Schedule a Visit',
    toggleLabel: 'Schedule a Visit',
    patientName: 'Patient name',
    patientEmail: 'Patient email',
    doctorName: 'Doctor',
    chooseDoctor: 'Choose a doctor',
    preferredTime: 'Preferred time',
    timeHint: 'Use your local timezone',
    symptoms: 'Symptoms / notes (optional)',
    symptomsPlaceholder: 'Add context to help your doctor prepare...',
    book: 'Book Appointment',
    scheduling: 'Scheduling...',
    confirmed: 'Appointment confirmed — check your email.',
    failed: 'We could not schedule your appointment. Please try again later.',
    doxyLinkLabel: 'Join appointment',
    calendarLinkLabel: 'Add to Google Calendar',
    fieldRequired: 'Please fill in all required fields before booking.',
  },
  es: {
    scheduleVisit: 'Agendar visita',
    toggleLabel: 'Agendar visita',
    patientName: 'Nombre del paciente',
    patientEmail: 'Correo del paciente',
    doctorName: 'Doctor',
    chooseDoctor: 'Selecciona un doctor',
    preferredTime: 'Horario preferido',
    timeHint: 'Usa tu zona horaria local',
    symptoms: 'Síntomas / notas (opcional)',
    symptomsPlaceholder: 'Añade contexto para ayudar a tu doctor a prepararse...',
    book: 'Agendar cita',
    scheduling: 'Agendando...',
    confirmed: 'Cita confirmada — revisa tu correo.',
    failed: 'No se pudo agendar la cita. Intenta nuevamente.',
    doxyLinkLabel: 'Entrar a la cita',
    calendarLinkLabel: 'Agregar a Google Calendar',
    fieldRequired: 'Completa los campos obligatorios antes de agendar.',
  },
};

export const getSchedulerCopy = (lang: SupportedLang = 'en'): SchedulerCopy =>
  i18n[lang] ?? i18n.en;
