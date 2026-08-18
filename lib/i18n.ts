export type SupportedLang = 'en' | 'es';

export interface ChatSchedulerCopy {
  startCta: string;
  introGreeting: string;
  askName: string;
  askEmail: string;
  askSymptoms: string;
  askTime: string;
  askTimeHelp: string;
  askLocale: string;
  optionalSkipHint: string;
  confirmScheduling: string;
  successHeadline: string;
  successDetails: string;
  failureHeadline: string;
  failureDetails: string;
  invalidName: string;
  invalidEmail: string;
  invalidTime: string;
  invalidSymptoms: string;
  acknowledgePrefill: string;
  viewDoxy: string;
  addCalendar: string;
  agentSignature: string;
}

export const i18n: Record<SupportedLang, ChatSchedulerCopy> = {
  en: {
    startCta: '📅 Schedule a Visit',
    introGreeting:
      'Hi 👋 I can book your telehealth visit right here. Just a few quick questions.',
    askName: 'To start, what name should the doctor greet you with?',
    askEmail: 'Great, what email should we send the appointment details to?',
    askSymptoms: 'What would you like to speak with the doctor about?',
    askTime:
      'When would you prefer to meet? You can share something like “tomorrow at 5pm” or “2025-10-12 09:30”.',
    askTimeHelp: 'Feel free to include your timezone if you travel often.',
    askLocale:
      'Any preferred language or location context the care team should consider? (optional, you can say “skip”).',
    optionalSkipHint: 'You can type “skip” to move ahead.',
    confirmScheduling: 'Perfect, give me a few seconds while I schedule that.',
    successHeadline: '✅ Appointment confirmed. Check your email for details.',
    successDetails:
      'You are all set. These links will also stay here if you need them again.',
    failureHeadline: '❌ Hmm... something went wrong.',
    failureDetails:
      'Please try again or reach out to our care team if the issue continues.',
    invalidName: 'Let’s try that again, please share the name you use with clinicians.',
    invalidEmail:
      'I could not read that email. Can you re-enter it like name@example.com?',
    invalidTime:
      'I could not understand that time. Try something like “tomorrow at 16:30” or “2025-10-12 09:30”.',
    invalidSymptoms:
      'Share a short note about what you need from the appointment so the doctor can prepare.',
    acknowledgePrefill:
      'I’ll use the name and email from your profile; let me know if anything needs updating.',
    viewDoxy: 'Join the visit',
    addCalendar: 'Add to Google Calendar',
    agentSignature: 'Medikah Scheduling Assistant',
  },
  es: {
    startCta: '📅 Agendar visita',
    introGreeting:
      'Hola 👋 puedo agendar tu consulta en este chat. Solo necesito unos datos rápidos.',
    askName: 'Para comenzar, ¿con qué nombre debe saludarte el doctor?',
    askEmail:
      'Perfecto, ¿a qué correo enviamos los detalles de la cita?',
    askSymptoms: '¿Qué te gustaría conversar con el doctor en la consulta?',
    askTime:
      '¿Cuándo prefieres la consulta? Puedes decir “mañana a las 17:00” o “2025-10-12 09:30”.',
    askTimeHelp: 'Si viajas seguido, comparte también tu zona horaria.',
    askLocale:
      '¿Alguna preferencia de idioma o contexto local que debamos considerar? (opcional, puedes responder “saltar”).',
    optionalSkipHint: 'Escribe “saltar” si quieres continuar sin agregar nada.',
    confirmScheduling: 'Perfecto, dame unos segundos para agendar tu cita.',
    successHeadline: '✅ Cita confirmada. Revisa tu correo para ver los detalles.',
    successDetails:
      'Todo listo. Estos enlaces quedarán aquí por si los necesitas de nuevo.',
    failureHeadline: '❌ Ups... hubo un problema.',
    failureDetails:
      'Intenta otra vez o contáctanos si el problema continúa.',
    invalidName:
      'Intentemos de nuevo, comparte el nombre que usas con tus médicos.',
    invalidEmail:
      'No pude leer ese correo. ¿Puedes escribirlo de nuevo como nombre@ejemplo.com?',
    invalidTime:
      'No entendí ese horario. Prueba con “mañana a las 16:30” o “2025-10-12 09:30”.',
    invalidSymptoms:
      'Comparte una nota breve sobre lo que necesitas para que el doctor pueda prepararse.',
    acknowledgePrefill:
      'Usaré el nombre y correo de tu perfil; dime si necesitas cambiarlos.',
    viewDoxy: 'Entrar a la consulta',
    addCalendar: 'Agregar a Google Calendar',
    agentSignature: 'Asistente de Agendamiento Medikah',
  },
};

export const getSchedulerCopy = (
  lang: SupportedLang = 'en',
): ChatSchedulerCopy => i18n[lang] ?? i18n.en;
