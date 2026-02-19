import { SupportedLang } from './i18n';

export const ONBOARDING_VERSION = '1.0';

export interface OnboardingCopy {
  // Conversational Opening
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  howAreYou: string;
  sessionIntro: string;
  sessionOverview: string;

  // Executive Briefing (peppered throughout)
  welcomeTitle: string;
  welcomeBriefing: string[];

  // Medikah context snippets (to weave in)
  medikahSnippet1: string; // Why we exist
  medikahSnippet2: string; // The network vision
  medikahSnippet3: string; // Why this matters
  medikahSnippet4: string; // Founding physicians

  // Phase 1: Identity
  phase1Title: string;
  askFullName: string;
  askLinkedIn: string;
  linkedInFound: string;
  askLinkedInPermission: string;
  askPhotoUpload: string;
  photoUploadHint: string;

  // Phase 2: Licensing
  phase2Title: string;
  phase2Vision: string;
  askCountriesLicensed: string;
  askMexicoLicense: string;
  askUSALicense: string;
  askUSAState: string;
  askOtherLicense: string;
  licenseNote: string;

  // Phase 3: Specialty
  phase3Title: string;
  askPrimarySpecialty: string;
  askSubSpecialties: string;
  askBoardCertifications: string;
  specialtyNote: string;

  // Phase 4: Education
  phase4Title: string;
  askMedicalSchool: string;
  askMedicalSchoolCountry: string;
  askGraduationYear: string;
  askHonors: string;
  askResidency: string;
  askResidencyYears: string;
  askFellowships: string;

  // Phase 5: Intellectual
  phase5Title: string;
  phase5Vision: string;
  askGoogleScholar: string;
  askPublications: string;
  askPresentations: string;
  askBooks: string;
  intellectualNote: string;

  // Phase 6: Presence
  phase6Title: string;
  askCurrentInstitutions: string;
  askWebsite: string;
  askSocialProfiles: string;
  askAvailableDays: string;
  askAvailableHours: string;
  askTimezone: string;
  askLanguages: string;

  // Phase 7: Confirmation
  phase7Title: string;
  phase7Vision: string;
  profileSummaryTitle: string;
  confirmationQuestion: string;
  editPrompt: string;

  // Completion
  completionTitle: string;
  completionMessage: string[];

  // Validation
  invalidName: string;
  invalidEmail: string;
  invalidUrl: string;
  invalidLicense: string;
  invalidYear: string;

  // Navigation
  skipPrompt: string;
  continuePrompt: string;
  backPrompt: string;

  // Phase 6.5: Narrative (between presence and confirmation)
  narrativeTitle: string;
  narrativeVision: string;
  narrativeComplete: string;

  // Common
  yes: string;
  no: string;
  optional: string;
  required: string;
}

export const onboardingCopy: Record<SupportedLang, OnboardingCopy> = {
  en: {
    // Conversational Opening
    greetingMorning: 'Good morning, Doctor.',
    greetingAfternoon: 'Good afternoon, Doctor.',
    greetingEvening: 'Good evening, Doctor.',
    howAreYou: 'How are you doing today?',
    sessionIntro: 'I\'m here to guide you through joining the Medikah Physician Network. We\'ll have a conversation where you can simply tell me about yourself, and I\'ll help build your profile.',
    sessionOverview: 'You can track our progress in the sidebar. Feel free to take your time—this is a conversation, not a form.',

    // Executive Briefing
    welcomeTitle: 'Welcome to the Medikah Physician Network',
    welcomeBriefing: [
      'You are joining something historic. Medikah is building the first credentialed physician network spanning the Americas—from Canada to Argentina, from the Caribbean to the Pacific.',
      'For too long, excellent physicians have been isolated by borders that their patients routinely cross. Families live between countries. Medical needs don\'t respect jurisdictions. Yet the infrastructure to coordinate care across these boundaries has never existed.',
      'Until now. You are among the founding physicians of this network. The ground floor of hemisphere-scale coordination. Let\'s build your profile so patients and colleagues can find you.',
    ],

    // Medikah context snippets (to weave in throughout)
    medikahSnippet1: 'Medikah exists because healthcare doesn\'t stop at borders, but until now, medical coordination did.',
    medikahSnippet2: 'We\'re building the first credentialed physician network across the Americas—physicians like you who can serve patients wherever they are.',
    medikahSnippet3: 'Your credentials tell a story of dedication. We\'re honored to have physicians of your caliber joining the network.',
    medikahSnippet4: 'You\'re among the founding physicians of this network. That matters.',

    // Phase 1: Identity
    phase1Title: 'Let\'s start with who you are',
    askFullName: 'What is your full name, as it appears on your medical license?',
    askLinkedIn: 'Do you have a LinkedIn profile? It helps me get to know you better and saves you some typing. I can pull in relevant information automatically.',
    linkedInFound: 'I found your LinkedIn profile. Here\'s what I can import:',
    askLinkedInPermission: 'May I use this information to pre-fill your profile? You can edit anything afterward.',
    askPhotoUpload: 'Please upload a professional photo. This is how patients and colleagues will recognize you in the network.',
    photoUploadHint: 'A clear headshot in professional attire works best.',

    // Phase 2: Licensing
    phase2Title: 'Your Medical Licenses',
    phase2Vision: 'Physicians across the Americas are joining Medikah to practice within clear regulatory frameworks. Your licenses define where you can serve patients.',
    askCountriesLicensed: 'In which countries do you hold active medical licenses? (You can list multiple: Mexico, USA, Colombia, Brazil, etc.)',
    askMexicoLicense: 'For Mexico, please provide your Cédula Profesional number.',
    askUSALicense: 'For the USA, please provide your medical license number.',
    askUSAState: 'Which state(s) are you licensed in?',
    askOtherLicense: 'Please provide your license or credential ID for {country}.',
    licenseNote: 'We will verify these credentials as part of our network credentialing process. This protects both you and your patients.',

    // Phase 3: Specialty
    phase3Title: 'Your Expertise',
    askPrimarySpecialty: 'What is your primary medical specialty?',
    askSubSpecialties: 'Do you have any sub-specialties or areas of focused practice?',
    askBoardCertifications: 'What board certifications do you hold? (e.g., American Board of Internal Medicine, Royal College of Physicians)',
    specialtyNote: 'This is how you\'ll appear in the network when patients search for specific expertise.',

    // Phase 4: Education
    phase4Title: 'Your Training',
    askMedicalSchool: 'Where did you attend medical school?',
    askMedicalSchoolCountry: 'In which country?',
    askGraduationYear: 'What year did you graduate?',
    askHonors: 'Did you receive any honors or distinctions? (cum laude, scholarships, awards)',
    askResidency: 'Where did you complete your residency?',
    askResidencyYears: 'What years? (e.g., 2015-2018)',
    askFellowships: 'Did you complete any fellowships or advanced training?',

    // Phase 5: Intellectual
    phase5Title: 'Your Contributions to Medicine',
    phase5Vision: 'The physicians in our network aren\'t just practitioners—they\'re contributors to medical knowledge. This builds trust.',
    askGoogleScholar: 'Do you have a Google Scholar profile? If so, share the link and I can import your publications.',
    askPublications: 'Would you like to list key publications manually?',
    askPresentations: 'Have you presented at medical conferences or grand rounds?',
    askBooks: 'Have you authored or contributed to any medical books or textbooks?',
    intellectualNote: 'This information helps patients understand your depth of expertise.',

    // Phase 6: Presence
    phase6Title: 'Your Practice & Availability',
    askCurrentInstitutions: 'Where do you currently practice? (Hospital, clinic, or private practice)',
    askWebsite: 'Do you have a professional website?',
    askSocialProfiles: 'Any other professional profiles? (Twitter/X, ResearchGate, Academia.edu)',
    askAvailableDays: 'Which days are you typically available for informational consultations?',
    askAvailableHours: 'What hours work best? (e.g., 9am-5pm)',
    askTimezone: 'What timezone are you in?',
    askLanguages: 'In which languages can you conduct consultations? (Spanish, English, Portuguese, etc.)',

    // Phase 7: Confirmation
    phase7Title: 'Your Medikah Profile',
    phase7Vision: 'Here\'s what we\'re building together: a network where physicians like you can serve patients across borders, within proper regulatory frameworks, with institutional support. You\'re part of that foundation.',
    profileSummaryTitle: 'Your Profile Summary',
    confirmationQuestion: 'Does everything look correct?',
    editPrompt: 'What would you like to change?',

    // Phase 6.5: Narrative
    narrativeTitle: 'Your Story',
    narrativeVision: 'Credentials tell what you\'ve done. This next part tells who you are. These questions help us build a profile that connects with patients on a human level — no right or wrong answers.',
    narrativeComplete: 'Thank you. These answers will help us craft a profile that truly represents you.',

    // Completion
    completionTitle: 'Welcome to Medikah',
    completionMessage: [
      'Your profile has been submitted for credentialing review. We take this seriously—it\'s what makes the network trustworthy.',
      'You\'ll receive an email confirmation shortly, and our credentialing team will be in touch within 48-72 hours.',
      'Thank you for joining the founding physicians of the Americas\' first credentialed cross-border medical network.',
    ],

    // Validation
    invalidName: 'Please provide your full legal name as it appears on your medical license.',
    invalidEmail: 'Please provide a valid email address.',
    invalidUrl: 'That doesn\'t look like a valid URL. Please check and try again.',
    invalidLicense: 'Please provide a valid license number.',
    invalidYear: 'Please provide a valid year (e.g., 2015).',

    // Navigation
    skipPrompt: 'Skip this for now',
    continuePrompt: 'Continue',
    backPrompt: 'Go back',

    // Common
    yes: 'Yes',
    no: 'No',
    optional: '(optional)',
    required: '(required)',
  },

  es: {
    // Conversational Opening
    greetingMorning: 'Buenos días, Doctor.',
    greetingAfternoon: 'Buenas tardes, Doctor.',
    greetingEvening: 'Buenas noches, Doctor.',
    howAreYou: '¿Cómo está hoy?',
    sessionIntro: 'Estoy aquí para guiarle a través del proceso de unirse a la Red de Médicos de Medikah. Tendremos una conversación donde simplemente puede contarme sobre usted, y yo le ayudaré a construir su perfil.',
    sessionOverview: 'Puede seguir nuestro progreso en la barra lateral. Tómese su tiempo—esto es una conversación, no un formulario.',

    // Executive Briefing
    welcomeTitle: 'Bienvenido a la Red de Médicos de Medikah',
    welcomeBriefing: [
      'Está uniéndose a algo histórico. Medikah está construyendo la primera red de médicos acreditados que abarca las Américas—desde Canadá hasta Argentina, desde el Caribe hasta el Pacífico.',
      'Durante demasiado tiempo, médicos excelentes han estado aislados por fronteras que sus pacientes cruzan rutinariamente. Las familias viven entre países. Las necesidades médicas no respetan jurisdicciones. Sin embargo, la infraestructura para coordinar la atención a través de estas fronteras nunca ha existido.',
      'Hasta ahora. Usted está entre los médicos fundadores de esta red. La planta baja de la coordinación a escala hemisférica. Construyamos su perfil para que pacientes y colegas puedan encontrarlo.',
    ],

    // Medikah context snippets (to weave in throughout)
    medikahSnippet1: 'Medikah existe porque la atención médica no se detiene en las fronteras, pero hasta ahora, la coordinación médica sí lo hacía.',
    medikahSnippet2: 'Estamos construyendo la primera red de médicos acreditados en las Américas—médicos como usted que pueden atender pacientes donde sea que estén.',
    medikahSnippet3: 'Sus credenciales cuentan una historia de dedicación. Nos honra tener médicos de su calibre uniéndose a la red.',
    medikahSnippet4: 'Usted está entre los médicos fundadores de esta red. Eso importa.',

    // Phase 1: Identity
    phase1Title: 'Comencemos con quién es usted',
    askFullName: '¿Cuál es su nombre completo, tal como aparece en su licencia médica?',
    askLinkedIn: '¿Tiene un perfil de LinkedIn? Me ayuda a conocerlo mejor y le ahorra algo de escritura. Puedo extraer información relevante automáticamente.',
    linkedInFound: 'Encontré su perfil de LinkedIn. Esto es lo que puedo importar:',
    askLinkedInPermission: '¿Puedo usar esta información para prellenar su perfil? Puede editar cualquier cosa después.',
    askPhotoUpload: 'Por favor suba una foto profesional. Así es como los pacientes y colegas lo reconocerán en la red.',
    photoUploadHint: 'Una foto clara de rostro con vestimenta profesional funciona mejor.',

    // Phase 2: Licensing
    phase2Title: 'Sus Licencias Médicas',
    phase2Vision: 'Médicos de toda América se están uniendo a Medikah para ejercer dentro de marcos regulatorios claros. Sus licencias definen dónde puede atender pacientes.',
    askCountriesLicensed: '¿En qué países tiene licencias médicas activas? (Puede listar varios: México, EE.UU., Colombia, Brasil, etc.)',
    askMexicoLicense: 'Para México, por favor proporcione su número de Cédula Profesional.',
    askUSALicense: 'Para EE.UU., por favor proporcione su número de licencia médica.',
    askUSAState: '¿En qué estado(s) está licenciado?',
    askOtherLicense: 'Por favor proporcione su licencia o ID de credencial para {country}.',
    licenseNote: 'Verificaremos estas credenciales como parte de nuestro proceso de acreditación. Esto lo protege tanto a usted como a sus pacientes.',

    // Phase 3: Specialty
    phase3Title: 'Su Experiencia',
    askPrimarySpecialty: '¿Cuál es su especialidad médica principal?',
    askSubSpecialties: '¿Tiene subespecialidades o áreas de práctica enfocada?',
    askBoardCertifications: '¿Qué certificaciones de consejo tiene? (ej., American Board of Internal Medicine, Consejo Mexicano de...)',
    specialtyNote: 'Así aparecerá en la red cuando los pacientes busquen experiencia específica.',

    // Phase 4: Education
    phase4Title: 'Su Formación',
    askMedicalSchool: '¿Dónde estudió medicina?',
    askMedicalSchoolCountry: '¿En qué país?',
    askGraduationYear: '¿En qué año se graduó?',
    askHonors: '¿Recibió honores o distinciones? (cum laude, becas, premios)',
    askResidency: '¿Dónde completó su residencia?',
    askResidencyYears: '¿Qué años? (ej., 2015-2018)',
    askFellowships: '¿Completó fellowships o entrenamiento avanzado?',

    // Phase 5: Intellectual
    phase5Title: 'Sus Contribuciones a la Medicina',
    phase5Vision: 'Los médicos en nuestra red no son solo practicantes—son contribuyentes al conocimiento médico. Esto genera confianza.',
    askGoogleScholar: '¿Tiene un perfil de Google Scholar? Si es así, comparta el enlace y puedo importar sus publicaciones.',
    askPublications: '¿Desea listar publicaciones clave manualmente?',
    askPresentations: '¿Ha presentado en conferencias médicas o sesiones académicas?',
    askBooks: '¿Ha escrito o contribuido a libros o textos médicos?',
    intellectualNote: 'Esta información ayuda a los pacientes a entender la profundidad de su experiencia.',

    // Phase 6: Presence
    phase6Title: 'Su Práctica y Disponibilidad',
    askCurrentInstitutions: '¿Dónde ejerce actualmente? (Hospital, clínica o práctica privada)',
    askWebsite: '¿Tiene un sitio web profesional?',
    askSocialProfiles: '¿Otros perfiles profesionales? (Twitter/X, ResearchGate, Academia.edu)',
    askAvailableDays: '¿Qué días está típicamente disponible para consultas informativas?',
    askAvailableHours: '¿Qué horarios funcionan mejor? (ej., 9am-5pm)',
    askTimezone: '¿En qué zona horaria está?',
    askLanguages: '¿En qué idiomas puede realizar consultas? (Español, Inglés, Portugués, etc.)',

    // Phase 7: Confirmation
    phase7Title: 'Su Perfil de Medikah',
    phase7Vision: 'Esto es lo que estamos construyendo juntos: una red donde médicos como usted pueden atender pacientes a través de fronteras, dentro de marcos regulatorios apropiados, con apoyo institucional. Usted es parte de esa base.',
    profileSummaryTitle: 'Resumen de Su Perfil',
    confirmationQuestion: '¿Todo se ve correcto?',
    editPrompt: '¿Qué le gustaría cambiar?',

    // Phase 6.5: Narrative
    narrativeTitle: 'Su Historia',
    narrativeVision: 'Las credenciales cuentan lo que ha hecho. Esta siguiente parte cuenta quién es usted. Estas preguntas nos ayudan a construir un perfil que conecte con los pacientes a nivel humano — no hay respuestas correctas o incorrectas.',
    narrativeComplete: 'Gracias. Estas respuestas nos ayudarán a crear un perfil que verdaderamente lo represente.',

    // Completion
    completionTitle: 'Bienvenido a Medikah',
    completionMessage: [
      'Su perfil ha sido enviado para revisión de acreditación. Nos tomamos esto en serio—es lo que hace que la red sea confiable.',
      'Recibirá un correo de confirmación en breve, y nuestro equipo de acreditación se comunicará dentro de 48-72 horas.',
      'Gracias por unirse a los médicos fundadores de la primera red médica transfronteriza acreditada de las Américas.',
    ],

    // Validation
    invalidName: 'Por favor proporcione su nombre legal completo tal como aparece en su licencia médica.',
    invalidEmail: 'Por favor proporcione una dirección de correo electrónico válida.',
    invalidUrl: 'Eso no parece ser una URL válida. Por favor verifique e intente de nuevo.',
    invalidLicense: 'Por favor proporcione un número de licencia válido.',
    invalidYear: 'Por favor proporcione un año válido (ej., 2015).',

    // Navigation
    skipPrompt: 'Omitir por ahora',
    continuePrompt: 'Continuar',
    backPrompt: 'Regresar',

    // Common
    yes: 'Sí',
    no: 'No',
    optional: '(opcional)',
    required: '(requerido)',
  },
};

// Specialty options for dropdown/autocomplete
export const MEDICAL_SPECIALTIES = [
  'Allergy and Immunology',
  'Anesthesiology',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Family Medicine',
  'Gastroenterology',
  'General Surgery',
  'Geriatrics',
  'Hematology',
  'Infectious Disease',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Obstetrics and Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedic Surgery',
  'Otolaryngology (ENT)',
  'Pathology',
  'Pediatrics',
  'Physical Medicine and Rehabilitation',
  'Plastic Surgery',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Sports Medicine',
  'Thoracic Surgery',
  'Urology',
  'Vascular Surgery',
];

// Countries with medical licensing
export const LICENSED_COUNTRIES = [
  { code: 'MX', name: 'Mexico', licenseType: 'Cédula Profesional' },
  { code: 'US', name: 'United States', licenseType: 'State Medical License' },
  { code: 'CO', name: 'Colombia', licenseType: 'Tarjeta Profesional' },
  { code: 'BR', name: 'Brazil', licenseType: 'CRM' },
  { code: 'AR', name: 'Argentina', licenseType: 'Matrícula Nacional' },
  { code: 'CL', name: 'Chile', licenseType: 'Registro SIS' },
  { code: 'PE', name: 'Peru', licenseType: 'CMP' },
  { code: 'CA', name: 'Canada', licenseType: 'Provincial License' },
  { code: 'EC', name: 'Ecuador', licenseType: 'Registro SENESCYT' },
  { code: 'VE', name: 'Venezuela', licenseType: 'MPPS Registration' },
  { code: 'PA', name: 'Panama', licenseType: 'CSS Registration' },
  { code: 'CR', name: 'Costa Rica', licenseType: 'Colegio de Médicos' },
  { code: 'GT', name: 'Guatemala', licenseType: 'Colegiado Activo' },
  { code: 'DO', name: 'Dominican Republic', licenseType: 'Exequátur' },
  { code: 'PR', name: 'Puerto Rico', licenseType: 'Junta Examinadora' },
];

// US States for license selection
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
];

// Common timezones in the Americas
export const AMERICAS_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Monterrey', label: 'Monterrey' },
  { value: 'America/Tijuana', label: 'Tijuana' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'America/Lima', label: 'Lima' },
  { value: 'America/Santiago', label: 'Santiago' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Caracas', label: 'Caracas' },
  { value: 'America/Panama', label: 'Panama' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
];

// Days of week
export const DAYS_OF_WEEK = [
  { value: 'monday', en: 'Monday', es: 'Lunes' },
  { value: 'tuesday', en: 'Tuesday', es: 'Martes' },
  { value: 'wednesday', en: 'Wednesday', es: 'Miércoles' },
  { value: 'thursday', en: 'Thursday', es: 'Jueves' },
  { value: 'friday', en: 'Friday', es: 'Viernes' },
  { value: 'saturday', en: 'Saturday', es: 'Sábado' },
  { value: 'sunday', en: 'Sunday', es: 'Domingo' },
];

// Languages for consultations
export const CONSULTATION_LANGUAGES = [
  { code: 'es', en: 'Spanish', es: 'Español' },
  { code: 'en', en: 'English', es: 'Inglés' },
  { code: 'pt', en: 'Portuguese', es: 'Portugués' },
  { code: 'fr', en: 'French', es: 'Francés' },
  { code: 'de', en: 'German', es: 'Alemán' },
  { code: 'it', en: 'Italian', es: 'Italiano' },
  { code: 'zh', en: 'Mandarin Chinese', es: 'Chino Mandarín' },
  { code: 'ja', en: 'Japanese', es: 'Japonés' },
  { code: 'ko', en: 'Korean', es: 'Coreano' },
  { code: 'ar', en: 'Arabic', es: 'Árabe' },
  { code: 'hi', en: 'Hindi', es: 'Hindi' },
  { code: 'ru', en: 'Russian', es: 'Ruso' },
];

// Timezones grouped by region for context-aware selection
export const TIMEZONES_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  MX: [
    { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
    { value: 'America/Monterrey', label: 'Monterrey (CST)' },
    { value: 'America/Tijuana', label: 'Tijuana (PST)' },
    { value: 'America/Cancun', label: 'Cancún (EST)' },
    { value: 'America/Hermosillo', label: 'Hermosillo (MST)' },
    { value: 'America/Mazatlan', label: 'Mazatlán (MST)' },
  ],
  US: [
    { value: 'America/New_York', label: 'Eastern Time (EST)' },
    { value: 'America/Chicago', label: 'Central Time (CST)' },
    { value: 'America/Denver', label: 'Mountain Time (MST)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  ],
  CO: [
    { value: 'America/Bogota', label: 'Bogotá (COT)' },
  ],
  BR: [
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'America/Manaus', label: 'Manaus (AMT)' },
    { value: 'America/Recife', label: 'Recife (BRT)' },
  ],
  AR: [
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  ],
  CL: [
    { value: 'America/Santiago', label: 'Santiago (CLT)' },
  ],
  PE: [
    { value: 'America/Lima', label: 'Lima (PET)' },
  ],
  CA: [
    { value: 'America/Toronto', label: 'Toronto (EST)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST)' },
    { value: 'America/Edmonton', label: 'Edmonton (MST)' },
  ],
  EC: [
    { value: 'America/Guayaquil', label: 'Guayaquil (ECT)' },
  ],
  VE: [
    { value: 'America/Caracas', label: 'Caracas (VET)' },
  ],
  PA: [
    { value: 'America/Panama', label: 'Panama (EST)' },
  ],
  CR: [
    { value: 'America/Costa_Rica', label: 'San José (CST)' },
  ],
  GT: [
    { value: 'America/Guatemala', label: 'Guatemala City (CST)' },
  ],
  DO: [
    { value: 'America/Santo_Domingo', label: 'Santo Domingo (AST)' },
  ],
  PR: [
    { value: 'America/Puerto_Rico', label: 'Puerto Rico (AST)' },
  ],
};

// Batched form labels (bilingual)
export interface BatchedFormLabels {
  // Common
  back: string;
  continue: string;
  add: string;
  remove: string;
  optional: string;
  country: string;
  selectCountry: string;
  year: string;

  // Licensing form
  licensingTitle: string;
  licensingDescription: string;
  state: string;
  selectState: string;
  licenseType: string;
  licenseNumber: string;
  enterLicenseNumber: string;
  addAnotherLicense: string;
  removeLicense: string;

  // Specialty form
  specialtyTitle: string;
  specialtyDescription: string;
  primarySpecialty: string;
  selectPrimarySpecialty: string;
  subSpecialties: string;
  addCustomSpecialty: string;
  boardCertifications: string;
  certifyingBoard: string;
  certificationName: string;
  addCertification: string;

  // Education form
  educationTitle: string;
  educationDescription: string;
  medicalSchoolSection: string;
  medicalSchoolName: string;
  enterMedicalSchool: string;
  graduationYear: string;
  enterValidYear: string;
  honors: string;
  honorsPlaceholder: string;
  residencySection: string;
  institutionName: string;
  startYear: string;
  endYear: string;
  addResidency: string;
  fellowshipsSection: string;
  specialtyField: string;
  addFellowship: string;

  // Presence form
  presenceTitle: string;
  presenceDescription: string;
  currentPractice: string;
  institutions: string;
  institutionsPlaceholder: string;
  website: string;
  availabilitySection: string;
  availableDays: string;
  selectAtLeastOneDay: string;
  startTime: string;
  endTime: string;
  timezone: string;
  consultationLanguages: string;
  selectAtLeastOneLanguage: string;
}

export const batchedFormLabels: Record<SupportedLang, BatchedFormLabels> = {
  en: {
    // Common
    back: 'Back',
    continue: 'Continue',
    add: 'Add',
    remove: 'Remove',
    optional: '(optional)',
    country: 'Country',
    selectCountry: 'Select country',
    year: 'Year',

    // Licensing
    licensingTitle: 'Medical Licenses',
    licensingDescription: 'Enter all countries where you hold active medical licenses. Your licenses define where you can serve patients in the Medikah network.',
    state: 'State',
    selectState: 'Select state',
    licenseType: 'License Type',
    licenseNumber: 'License Number',
    enterLicenseNumber: 'Enter license number',
    addAnotherLicense: 'Add another license',
    removeLicense: 'Remove license',

    // Specialty
    specialtyTitle: 'Specialty & Certifications',
    specialtyDescription: 'Select your medical specialties and board certifications. This helps patients find the right specialist.',
    primarySpecialty: 'Primary Specialty',
    selectPrimarySpecialty: 'Select your primary specialty',
    subSpecialties: 'Sub-specialties',
    addCustomSpecialty: 'Type to add a custom specialty...',
    boardCertifications: 'Board Certifications',
    certifyingBoard: 'Certifying board',
    certificationName: 'Certification name',
    addCertification: 'Add certification',

    // Education
    educationTitle: 'Education & Training',
    educationDescription: 'Tell us about your medical education, residency, and any advanced training.',
    medicalSchoolSection: 'Medical School',
    medicalSchoolName: 'School Name',
    enterMedicalSchool: 'Enter medical school name',
    graduationYear: 'Graduation Year',
    enterValidYear: 'Please enter a valid year',
    honors: 'Honors & Distinctions',
    honorsPlaceholder: 'e.g., Cum Laude, Dean\'s List, scholarships...',
    residencySection: 'Residency',
    institutionName: 'Institution name',
    startYear: 'Start year',
    endYear: 'End year',
    addResidency: 'Add another residency',
    fellowshipsSection: 'Fellowships',
    specialtyField: 'Specialty/Field',
    addFellowship: 'Add fellowship',

    // Presence
    presenceTitle: 'Practice & Availability',
    presenceDescription: 'Where do you practice and when are you available for consultations?',
    currentPractice: 'Current Practice',
    institutions: 'Hospital, Clinic, or Practice',
    institutionsPlaceholder: 'e.g., Mayo Clinic, Private Practice...',
    website: 'Website',
    availabilitySection: 'Availability',
    availableDays: 'Available Days',
    selectAtLeastOneDay: 'Please select at least one day',
    startTime: 'Start Time',
    endTime: 'End Time',
    timezone: 'Timezone',
    consultationLanguages: 'Consultation Languages',
    selectAtLeastOneLanguage: 'Please select at least one language',
  },
  es: {
    // Common
    back: 'Atr\u00e1s',
    continue: 'Continuar',
    add: 'Agregar',
    remove: 'Eliminar',
    optional: '(opcional)',
    country: 'Pa\u00eds',
    selectCountry: 'Seleccionar pa\u00eds',
    year: 'A\u00f1o',

    // Licensing
    licensingTitle: 'Licencias M\u00e9dicas',
    licensingDescription: 'Ingrese todos los pa\u00edses donde tiene licencias m\u00e9dicas activas. Sus licencias definen d\u00f3nde puede atender pacientes en la red Medikah.',
    state: 'Estado',
    selectState: 'Seleccionar estado',
    licenseType: 'Tipo de Licencia',
    licenseNumber: 'N\u00famero de Licencia',
    enterLicenseNumber: 'Ingrese n\u00famero de licencia',
    addAnotherLicense: 'Agregar otra licencia',
    removeLicense: 'Eliminar licencia',

    // Specialty
    specialtyTitle: 'Especialidad y Certificaciones',
    specialtyDescription: 'Seleccione sus especialidades m\u00e9dicas y certificaciones de consejo. Esto ayuda a los pacientes a encontrar al especialista adecuado.',
    primarySpecialty: 'Especialidad Principal',
    selectPrimarySpecialty: 'Seleccione su especialidad principal',
    subSpecialties: 'Subespecialidades',
    addCustomSpecialty: 'Escriba para agregar una especialidad...',
    boardCertifications: 'Certificaciones de Consejo',
    certifyingBoard: 'Consejo certificador',
    certificationName: 'Nombre de certificaci\u00f3n',
    addCertification: 'Agregar certificaci\u00f3n',

    // Education
    educationTitle: 'Educaci\u00f3n y Formaci\u00f3n',
    educationDescription: 'Cu\u00e9ntenos sobre su educaci\u00f3n m\u00e9dica, residencia y formaci\u00f3n avanzada.',
    medicalSchoolSection: 'Escuela de Medicina',
    medicalSchoolName: 'Nombre de la Escuela',
    enterMedicalSchool: 'Ingrese nombre de la escuela de medicina',
    graduationYear: 'A\u00f1o de Graduaci\u00f3n',
    enterValidYear: 'Por favor ingrese un a\u00f1o v\u00e1lido',
    honors: 'Honores y Distinciones',
    honorsPlaceholder: 'ej., Cum Laude, Lista del Dec\u00e1n, becas...',
    residencySection: 'Residencia',
    institutionName: 'Nombre de la instituci\u00f3n',
    startYear: 'A\u00f1o inicio',
    endYear: 'A\u00f1o fin',
    addResidency: 'Agregar otra residencia',
    fellowshipsSection: 'Fellowships',
    specialtyField: 'Especialidad/Campo',
    addFellowship: 'Agregar fellowship',

    // Presence
    presenceTitle: 'Pr\u00e1ctica y Disponibilidad',
    presenceDescription: '\u00bfD\u00f3nde ejerce y cu\u00e1ndo est\u00e1 disponible para consultas?',
    currentPractice: 'Pr\u00e1ctica Actual',
    institutions: 'Hospital, Cl\u00ednica o Consultorio',
    institutionsPlaceholder: 'ej., Hospital General, Consultorio Privado...',
    website: 'Sitio Web',
    availabilitySection: 'Disponibilidad',
    availableDays: 'D\u00edas Disponibles',
    selectAtLeastOneDay: 'Por favor seleccione al menos un d\u00eda',
    startTime: 'Hora de Inicio',
    endTime: 'Hora de Fin',
    timezone: 'Zona Horaria',
    consultationLanguages: 'Idiomas de Consulta',
    selectAtLeastOneLanguage: 'Por favor seleccione al menos un idioma',
  },
};
