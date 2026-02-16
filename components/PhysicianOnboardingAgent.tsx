import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { SupportedLang } from '../lib/i18n';
import {
  onboardingCopy,
  DAYS_OF_WEEK,
  AMERICAS_TIMEZONES,
  CONSULTATION_LANGUAGES,
} from '../lib/physicianOnboardingContent';
import {
  PhysicianProfileData,
  PhysicianLicense,
  BoardCertification,
  Residency,
  Fellowship,
  createPhysicianProfile,
  logOnboardingAudit,
  checkPhysicianEmailExists,
} from '../lib/physicianClient';

// Message types
export interface OnboardingAction {
  label: string;
  value: string;
  type?: 'primary' | 'secondary' | 'skip' | 'toggle';
  selected?: boolean;
}

export interface OnboardingBotMessage {
  text: string;
  actions?: OnboardingAction[];
  isVision?: boolean;
  showLinkedInConnect?: boolean;
  linkedInPreview?: {
    fullName?: string;
    email?: string;
    photoUrl?: string;
    medicalSchool?: string;
    graduationYear?: number;
    currentInstitutions?: string[];
  };
  showPublicationSelector?: {
    publications: import('../lib/publications').Publication[];
    source: import('../lib/publications').PublicationSource;
    profileName?: string;
  };
  showManualPublicationForm?: boolean;
  isSummary?: boolean;
  summaryData?: Partial<PhysicianProfileData>;
  // Batched form rendering
  showBatchedForm?: 'licensing' | 'specialty' | 'education' | 'presence';
}

// Phases (simplified with batched forms)
type OnboardingPhase =
  | 'briefing'
  | 'identity'
  | 'licensing'
  | 'specialty'
  | 'education'
  | 'intellectual'
  | 'presence'
  | 'confirmation'
  | 'completed';

// Questions within each phase (reduced set)
type QuestionKey =
  // Identity
  | 'full_name'
  | 'email'
  | 'has_linkedin'
  | 'linkedin_url'
  | 'linkedin_confirm'
  // Batched forms (single question per phase)
  | 'licensing_form'
  | 'specialty_form'
  | 'education_form'
  // Intellectual (kept conversational - optional phase)
  | 'google_scholar'
  | 'publication_source'
  | 'pubmed_search'
  | 'researchgate_url'
  | 'academia_url'
  | 'publications_manual'
  | 'publications_select'
  | 'presentations'
  | 'books'
  // Batched form
  | 'presence_form'
  // Confirmation
  | 'confirm_profile'
  | 'edit_choice';

export type OnboardingAgentState =
  | 'idle'
  | 'briefing'
  | 'awaiting_user'
  | 'processing'
  | 'completed';

export interface PhysicianOnboardingAgentHandle {
  start: () => void;
  isActive: () => boolean;
  isAwaitingInput: () => boolean;
  handleUserInput: (input: string) => Promise<boolean>;
  handleActionClick: (value: string) => Promise<boolean>;
  handlePublicationSelection?: (publications: import('../lib/publications').Publication[]) => void;
  handleManualPublication?: (publication: import('../lib/publications').Publication) => void;
  updateToggleData: (values: string[]) => void;
  // Batched form callbacks
  handleLicensingSubmit?: (data: { licenses: PhysicianLicense[] }) => void;
  handleSpecialtySubmit?: (data: { primarySpecialty: string; subSpecialties: string[]; boardCertifications: BoardCertification[] }) => void;
  handleEducationSubmit?: (data: { medicalSchool: string; medicalSchoolCountry: string; graduationYear: number; honors: string[]; residency: Residency[]; fellowships: Fellowship[] }) => void;
  handlePresenceSubmit?: (data: {
    currentInstitutions: string[]; websiteUrl?: string; twitterUrl?: string;
    researchgateUrl?: string; academiaEduUrl?: string;
    availableDays: string[]; availableHoursStart: string; availableHoursEnd: string;
    timezone: string; languages: string[];
  }) => void;
  handleFormCancel?: () => void;
  getCollectedData: () => Partial<PhysicianProfileData>;
  getLicensedCountryCodes: () => string[];
}

interface LinkedInImportData {
  fullName?: string;
  email?: string;
  photoUrl?: string;
  medicalSchool?: string;
  graduationYear?: number;
  currentInstitutions?: string[];
}

interface PhysicianOnboardingAgentProps {
  lang: SupportedLang;
  appendMessage: (message: OnboardingBotMessage) => void;
  onStateChange?: (state: OnboardingAgentState) => void;
  onProfileReady?: (physicianId: string, physicianName: string) => void;
  linkedInData?: LinkedInImportData;
  sessionId?: string;
  sessionLinkedInData?: {
    fullName?: string | null;
    email?: string | null;
    photoUrl?: string | null;
  };
}

// Validation helpers
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Parse a LinkedIn profile URL, accepting various formats.
 * Returns { valid, slug, normalizedUrl } or { valid: false } if invalid.
 */
function parseLinkedInUrl(raw: string): {
  valid: boolean;
  slug?: string;
  normalizedUrl?: string;
} {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host !== 'linkedin.com') return { valid: false };
    const pathMatch = parsed.pathname.match(/^(?:\/[a-z]{2})?\/in\/([\w-]+)\/?$/i);
    if (!pathMatch) return { valid: false };
    const slug = pathMatch[1];
    return { valid: true, slug, normalizedUrl: `https://www.linkedin.com/in/${slug}` };
  } catch {
    return { valid: false };
  }
}

/**
 * Attempt to derive a human-readable name from a LinkedIn slug.
 */
function slugToName(slug: string): string | null {
  if (/^\d+$/.test(slug) || !slug.includes('-')) return null;
  const parts = slug.split('-').filter(Boolean);
  if (parts.length < 2 || parts.length > 6) return null;
  if (parts.some(p => p.length > 15 || /\d{3,}/.test(p))) return null;
  return parts
    .map(p => {
      if (p.toLowerCase() === 'dr') return 'Dr.';
      if (p.toLowerCase() === 'md') return 'MD';
      if (p.toLowerCase() === 'phd') return 'PhD';
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(' ');
}

const PhysicianOnboardingAgent = forwardRef<
  PhysicianOnboardingAgentHandle,
  PhysicianOnboardingAgentProps
>((props, ref) => {
  const { lang, appendMessage, onStateChange, onProfileReady, linkedInData, sessionId, sessionLinkedInData } = props;
  const copy = useMemo(() => onboardingCopy[lang], [lang]);

  const linkedInApplied = useRef(false);
  const appendMessageRef = useRef(appendMessage);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => { appendMessageRef.current = appendMessage; }, [appendMessage]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  // State
  const [state, setState] = useState<OnboardingAgentState>('idle');
  const [_phase, setPhase] = useState<OnboardingPhase>('briefing');
  const [question, setQuestion] = useState<QuestionKey | null>(null);

  // Collected data
  const dataRef = useRef<Partial<PhysicianProfileData>>({
    licenses: [],
    languages: ['es', 'en'],
  });

  // Stable wrappers
  const stableAppendMessage = useCallback((message: OnboardingBotMessage) => {
    appendMessageRef.current(message);
  }, []);

  const stableOnStateChange = useCallback((next: OnboardingAgentState) => {
    onStateChangeRef.current?.(next);
  }, []);

  const updateState = useCallback((next: OnboardingAgentState) => {
    setState(next);
    stableOnStateChange(next);
  }, [stableOnStateChange]);

  const askQuestion = useCallback((key: QuestionKey, message: string, actions?: OnboardingAction[]) => {
    setQuestion(key);
    updateState('awaiting_user');
    stableAppendMessage({ text: message, actions });
  }, [updateState, stableAppendMessage]);

  // Get time-based greeting
  const getTimeBasedGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return copy.greetingMorning;
    if (hour < 18) return copy.greetingAfternoon;
    return copy.greetingEvening;
  }, [copy]);

  // Generate profile summary
  const generateProfileSummary = useCallback((): string => {
    const data = dataRef.current;
    const lines: string[] = [];
    lines.push(`**${copy.profileSummaryTitle}**\n`);

    if (data.fullName) lines.push(`**Name:** ${data.fullName}`);
    if (data.email) lines.push(`**Email:** ${data.email}`);
    if (data.linkedinUrl) lines.push(`**LinkedIn:** ${data.linkedinUrl}`);

    if (data.licenses && data.licenses.length > 0) {
      lines.push(`\n**Licenses:**`);
      data.licenses.forEach(lic => {
        const stateInfo = lic.state ? ` (${lic.state})` : '';
        lines.push(`- ${lic.country}${stateInfo}: ${lic.number}`);
      });
    }

    if (data.primarySpecialty) lines.push(`\n**Primary Specialty:** ${data.primarySpecialty}`);
    if (data.subSpecialties?.length) lines.push(`**Sub-specialties:** ${data.subSpecialties.join(', ')}`);
    if (data.boardCertifications?.length) {
      lines.push(`**Board Certifications:**`);
      data.boardCertifications.forEach(cert => {
        lines.push(`- ${cert.board}: ${cert.certification}${cert.year ? ` (${cert.year})` : ''}`);
      });
    }

    if (data.medicalSchool) {
      lines.push(`\n**Medical School:** ${data.medicalSchool}${data.medicalSchoolCountry ? `, ${data.medicalSchoolCountry}` : ''}${data.graduationYear ? ` (${data.graduationYear})` : ''}`);
    }
    if (data.honors?.length) lines.push(`**Honors:** ${data.honors.join(', ')}`);

    if (data.residency?.length) {
      lines.push(`\n**Residency:**`);
      data.residency.forEach(r => {
        lines.push(`- ${r.institution}: ${r.specialty} (${r.startYear}-${r.endYear})`);
      });
    }
    if (data.fellowships?.length) {
      lines.push(`**Fellowships:**`);
      data.fellowships.forEach(f => {
        lines.push(`- ${f.institution}: ${f.specialty} (${f.startYear}-${f.endYear})`);
      });
    }

    if (data.googleScholarUrl) lines.push(`\n**Google Scholar:** ${data.googleScholarUrl}`);
    if (data.publications?.length) lines.push(`**Publications:** ${data.publications.length} listed`);
    if (data.presentations?.length) lines.push(`**Presentations:** ${data.presentations.length} listed`);

    if (data.currentInstitutions?.length) {
      lines.push(`\n**Current Practice:** ${data.currentInstitutions.join(', ')}`);
    }
    if (data.websiteUrl) lines.push(`**Website:** ${data.websiteUrl}`);

    if (data.availableDays?.length) {
      const dayLabels = data.availableDays.map(d => {
        const day = DAYS_OF_WEEK.find(dw => dw.value === d);
        return day ? day[lang] : d;
      });
      lines.push(`\n**Available Days:** ${dayLabels.join(', ')}`);
    }
    if (data.availableHoursStart && data.availableHoursEnd) {
      lines.push(`**Hours:** ${data.availableHoursStart} - ${data.availableHoursEnd}`);
    }
    if (data.timezone) {
      const tz = AMERICAS_TIMEZONES.find(t => t.value === data.timezone);
      lines.push(`**Timezone:** ${tz?.label || data.timezone}`);
    }
    if (data.languages?.length) {
      const langLabels = data.languages.map(l => {
        const language = CONSULTATION_LANGUAGES.find(cl => cl.code === l);
        return language ? language[lang] : l;
      });
      lines.push(`**Languages:** ${langLabels.join(', ')}`);
    }

    return lines.join('\n');
  }, [copy.profileSummaryTitle, lang]);

  // ── Phase transitions ──

  const startBriefing = useCallback(() => {
    setPhase('briefing');
    updateState('briefing');

    // Priority 1: Session-based LinkedIn data (signed in via LinkedIn provider)
    const effectiveLinkedInData: LinkedInImportData | undefined = sessionLinkedInData
      ? {
          fullName: sessionLinkedInData.fullName ?? undefined,
          email: sessionLinkedInData.email ?? undefined,
          photoUrl: sessionLinkedInData.photoUrl ?? undefined,
        }
      : linkedInData;

    // If LinkedIn data is already available (from session or OAuth callback),
    // skip full briefing and go straight to LinkedIn confirmation
    if (effectiveLinkedInData && !linkedInApplied.current) {
      linkedInApplied.current = true;
      const data = dataRef.current;

      if (effectiveLinkedInData.fullName) {
        data.linkedinUrl = `https://linkedin.com/in/${sessionId || 'profile'}`;
        data.linkedinImported = true;
      }

      stableAppendMessage({ text: getTimeBasedGreeting() });

      setTimeout(() => {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Welcome back! We\'ve connected your LinkedIn profile. Please confirm the imported data:'
            : '\u00a1Bienvenido de nuevo! Hemos conectado tu perfil de LinkedIn. Por favor confirma los datos importados:',
          linkedInPreview: effectiveLinkedInData,
        } as OnboardingBotMessage);

        setPhase('identity');
        setQuestion('linkedin_confirm');
        updateState('awaiting_user');
      }, 1200);

      return;
    }

    // Normal briefing flow
    const messages: Array<{ text: string; isVision?: boolean; delay: number }> = [
      { text: getTimeBasedGreeting(), delay: 0 },
      { text: copy.howAreYou, delay: 1200 },
      { text: copy.sessionIntro, delay: 2400 },
      { text: copy.sessionOverview, delay: 4000 },
    ];

    messages.forEach(({ text, isVision, delay }) => {
      setTimeout(() => {
        stableAppendMessage({ text, isVision });
      }, delay);
    });

    // Ask for LinkedIn first
    setTimeout(() => {
      setPhase('identity');
      setQuestion('has_linkedin');
      updateState('awaiting_user');
      stableAppendMessage({
        text: copy.askLinkedIn,
        actions: [
          { label: copy.yes, value: 'yes', type: 'primary' },
          { label: copy.no, value: 'no', type: 'secondary' },
        ],
      });
    }, 5800);
  }, [copy, stableAppendMessage, updateState, getTimeBasedGreeting, linkedInData, sessionLinkedInData, lang, sessionId]);

  const startLicensingPhase = useCallback(() => {
    setPhase('licensing');
    updateState('processing');

    stableAppendMessage({ text: copy.phase2Vision, isVision: true });

    setTimeout(() => {
      setQuestion('licensing_form');
      updateState('awaiting_user');
      stableAppendMessage({
        text: lang === 'en'
          ? 'Please fill in your medical license information below.'
          : 'Por favor complete su informaci\u00f3n de licencia m\u00e9dica a continuaci\u00f3n.',
        showBatchedForm: 'licensing',
      });
    }, 1200);
  }, [copy, lang, stableAppendMessage, updateState]);

  const startSpecialtyPhase = useCallback(() => {
    setPhase('specialty');
    updateState('processing');

    stableAppendMessage({
      text: lang === 'en'
        ? 'Now let\'s talk about your expertise. This helps patients find the right specialist.'
        : 'Ahora hablemos de su especialidad. Esto ayuda a los pacientes a encontrar al especialista adecuado.',
    });

    setTimeout(() => {
      setQuestion('specialty_form');
      updateState('awaiting_user');
      stableAppendMessage({
        text: lang === 'en'
          ? 'Select your specialties and certifications below.'
          : 'Seleccione sus especialidades y certificaciones a continuaci\u00f3n.',
        showBatchedForm: 'specialty',
      });
    }, 1000);
  }, [lang, stableAppendMessage, updateState]);

  const startEducationPhase = useCallback(() => {
    setPhase('education');
    setQuestion('education_form');
    updateState('awaiting_user');
    stableAppendMessage({
      text: lang === 'en'
        ? 'Tell us about your medical education and training.'
        : 'Cu\u00e9ntenos sobre su educaci\u00f3n y formaci\u00f3n m\u00e9dica.',
      showBatchedForm: 'education',
    });
  }, [lang, stableAppendMessage, updateState]);

  const startIntellectualPhase = useCallback(() => {
    setPhase('intellectual');
    stableAppendMessage({ text: copy.phase5Vision, isVision: true });
    setTimeout(() => {
      askQuestion('google_scholar', copy.askGoogleScholar, [
        { label: copy.yes, value: 'yes', type: 'primary' },
        { label: copy.no, value: 'no', type: 'secondary' },
      ]);
    }, 600);
  }, [copy, stableAppendMessage, askQuestion]);

  const startPresencePhase = useCallback(() => {
    setPhase('presence');
    setQuestion('presence_form');
    updateState('awaiting_user');
    stableAppendMessage({
      text: lang === 'en'
        ? 'Almost done! Tell us about your practice and availability.'
        : '\u00a1Casi terminamos! Cu\u00e9ntenos sobre su pr\u00e1ctica y disponibilidad.',
      showBatchedForm: 'presence',
    });
  }, [lang, stableAppendMessage, updateState]);

  const startConfirmationPhase = useCallback(() => {
    setPhase('confirmation');

    stableAppendMessage({ text: copy.phase7Vision });

    setTimeout(() => {
      const summary = generateProfileSummary();
      stableAppendMessage({
        text: summary,
        isSummary: true,
        summaryData: dataRef.current,
      });

      setTimeout(() => {
        askQuestion('confirm_profile', copy.confirmationQuestion, [
          { label: copy.yes, value: 'confirm', type: 'primary' },
          { label: copy.editPrompt, value: 'edit', type: 'secondary' },
        ]);
      }, 800);
    }, 1200);
  }, [copy, generateProfileSummary, stableAppendMessage, askQuestion]);

  const completeOnboarding = useCallback(async () => {
    updateState('processing');

    stableAppendMessage({
      text: lang === 'en'
        ? 'Excellent! Your profile is ready. Before we finalize your registration, please review and sign the Physician Network Agreement.'
        : '\u00a1Excelente! Su perfil est\u00e1 listo. Antes de finalizar su registro, por favor revise y firme el Acuerdo de Red de M\u00e9dicos.',
      isVision: true,
    });

    const profileData: PhysicianProfileData = {
      fullName: dataRef.current.fullName || '',
      email: dataRef.current.email || '',
      photoUrl: dataRef.current.photoUrl,
      linkedinUrl: dataRef.current.linkedinUrl,
      linkedinImported: dataRef.current.linkedinImported,
      licenses: dataRef.current.licenses || [],
      primarySpecialty: dataRef.current.primarySpecialty,
      subSpecialties: dataRef.current.subSpecialties,
      boardCertifications: dataRef.current.boardCertifications,
      medicalSchool: dataRef.current.medicalSchool,
      medicalSchoolCountry: dataRef.current.medicalSchoolCountry,
      graduationYear: dataRef.current.graduationYear,
      honors: dataRef.current.honors,
      residency: dataRef.current.residency,
      fellowships: dataRef.current.fellowships,
      googleScholarUrl: dataRef.current.googleScholarUrl,
      publications: dataRef.current.publications,
      presentations: dataRef.current.presentations,
      books: dataRef.current.books,
      currentInstitutions: dataRef.current.currentInstitutions,
      websiteUrl: dataRef.current.websiteUrl,
      twitterUrl: dataRef.current.twitterUrl,
      researchgateUrl: dataRef.current.researchgateUrl,
      academiaEduUrl: dataRef.current.academiaEduUrl,
      availableDays: dataRef.current.availableDays,
      availableHoursStart: dataRef.current.availableHoursStart,
      availableHoursEnd: dataRef.current.availableHoursEnd,
      timezone: dataRef.current.timezone,
      languages: dataRef.current.languages || ['es', 'en'],
      onboardingLanguage: lang,
    };

    const result = await createPhysicianProfile(profileData);

    if (result.success && result.physicianId) {
      await logOnboardingAudit({
        physicianId: result.physicianId,
        email: profileData.email,
        action: 'phase_completed',
        phase: 'profile_created',
        dataSnapshot: profileData as unknown as Record<string, unknown>,
        language: lang,
      });

      const physicianId = result.physicianId;
      setTimeout(() => {
        onProfileReady?.(physicianId, profileData.fullName);
      }, 800);

      setPhase('confirmation');
    } else {
      stableAppendMessage({
        text: lang === 'en'
          ? 'There was an issue saving your profile. Please try again or contact support@medikah.health.'
          : 'Hubo un problema al guardar su perfil. Por favor intente de nuevo o contacte support@medikah.health.',
      });
      updateState('awaiting_user');
    }
  }, [lang, stableAppendMessage, updateState, onProfileReady]);

  // ── Batched form handlers ──

  const handleLicensingSubmit = useCallback((formData: { licenses: PhysicianLicense[] }) => {
    dataRef.current.licenses = formData.licenses;
    stableAppendMessage({
      text: lang === 'en'
        ? `${formData.licenses.length} license(s) recorded. ${copy.licenseNote}`
        : `${formData.licenses.length} licencia(s) registrada(s). ${copy.licenseNote}`,
    });
    setTimeout(() => startSpecialtyPhase(), 600);
  }, [lang, copy, stableAppendMessage, startSpecialtyPhase]);

  const handleSpecialtySubmit = useCallback((formData: {
    primarySpecialty: string;
    subSpecialties: string[];
    boardCertifications: BoardCertification[];
  }) => {
    dataRef.current.primarySpecialty = formData.primarySpecialty;
    dataRef.current.subSpecialties = formData.subSpecialties;
    dataRef.current.boardCertifications = formData.boardCertifications;
    stableAppendMessage({ text: copy.specialtyNote });
    setTimeout(() => startEducationPhase(), 600);
  }, [copy, stableAppendMessage, startEducationPhase]);

  const handleEducationSubmit = useCallback((formData: {
    medicalSchool: string;
    medicalSchoolCountry: string;
    graduationYear: number;
    honors: string[];
    residency: Residency[];
    fellowships: Fellowship[];
  }) => {
    dataRef.current.medicalSchool = formData.medicalSchool;
    dataRef.current.medicalSchoolCountry = formData.medicalSchoolCountry;
    dataRef.current.graduationYear = formData.graduationYear;
    dataRef.current.honors = formData.honors;
    dataRef.current.residency = formData.residency;
    dataRef.current.fellowships = formData.fellowships;
    startIntellectualPhase();
  }, [startIntellectualPhase]);

  const handlePresenceSubmit = useCallback((formData: {
    currentInstitutions: string[];
    websiteUrl?: string;
    twitterUrl?: string;
    researchgateUrl?: string;
    academiaEduUrl?: string;
    availableDays: string[];
    availableHoursStart: string;
    availableHoursEnd: string;
    timezone: string;
    languages: string[];
  }) => {
    dataRef.current.currentInstitutions = formData.currentInstitutions;
    dataRef.current.websiteUrl = formData.websiteUrl;
    dataRef.current.twitterUrl = formData.twitterUrl;
    dataRef.current.researchgateUrl = formData.researchgateUrl;
    dataRef.current.academiaEduUrl = formData.academiaEduUrl;
    dataRef.current.availableDays = formData.availableDays;
    dataRef.current.availableHoursStart = formData.availableHoursStart;
    dataRef.current.availableHoursEnd = formData.availableHoursEnd;
    dataRef.current.timezone = formData.timezone;
    dataRef.current.languages = formData.languages;
    startConfirmationPhase();
  }, [startConfirmationPhase]);

  const handleFormCancel = useCallback(() => {
    // Go back to previous phase - user can re-approach
    stableAppendMessage({
      text: lang === 'en'
        ? 'No worries. Let me know when you\'re ready to continue.'
        : 'No se preocupe. Av\u00edseme cuando est\u00e9 listo para continuar.',
    });
  }, [lang, stableAppendMessage]);

  // ── Handle user text input ──

  const handleUserInput = useCallback(async (rawInput: string): Promise<boolean> => {
    if (state === 'idle' || state === 'completed' || state === 'processing') {
      return false;
    }

    const input = rawInput.trim();
    const currentQuestion = question;
    if (!currentQuestion) return false;

    const data = dataRef.current;

    switch (currentQuestion) {
      // Identity Phase
      case 'full_name': {
        if (!input || input.length < 3) {
          stableAppendMessage({ text: copy.invalidName });
          return true;
        }
        data.fullName = input;
        askQuestion('email', lang === 'en' ? 'What is your professional email address?' : '\u00bfCu\u00e1l es su correo electr\u00f3nico profesional?');
        return true;
      }

      case 'email': {
        if (!isValidEmail(input)) {
          stableAppendMessage({ text: copy.invalidEmail });
          return true;
        }

        try {
          const existsPromise = checkPhysicianEmailExists(input);
          const timeoutPromise = new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          );
          const exists = await Promise.race([existsPromise, timeoutPromise]);

          if (exists) {
            stableAppendMessage({
              text: lang === 'en'
                ? 'This email is already registered in our network. Please use a different email or contact support if this is an error.'
                : 'Este correo ya est\u00e1 registrado en nuestra red. Por favor use un correo diferente o contacte soporte si esto es un error.',
            });
            return true;
          }
        } catch (error) {
          console.warn('Email check failed, continuing:', error);
        }

        data.email = input.toLowerCase();

        logOnboardingAudit({
          email: data.email,
          action: 'started',
          phase: 'identity',
          language: lang,
        }).catch(err => console.warn('Audit log failed:', err));

        startLicensingPhase();
        return true;
      }

      case 'linkedin_url': {
        if (!input) {
          setTimeout(() => { askQuestion('full_name', copy.askFullName); }, 500);
          return true;
        }

        const parsed = parseLinkedInUrl(input);
        if (!parsed.valid) {
          stableAppendMessage({
            text: lang === 'en'
              ? 'That doesn\'t look like a valid LinkedIn profile URL. Please enter a URL like: https://linkedin.com/in/your-name'
              : 'Eso no parece ser una URL de perfil de LinkedIn v\u00e1lida. Por favor ingrese una URL como: https://linkedin.com/in/su-nombre',
          });
          return true;
        }

        data.linkedinUrl = parsed.normalizedUrl;
        const displayUrl = `linkedin.com/in/${parsed.slug}`;
        stableAppendMessage({
          text: lang === 'en'
            ? `LinkedIn profile linked: ${displayUrl}`
            : `Perfil de LinkedIn vinculado: ${displayUrl}`,
        });

        const suggestedName = parsed.slug ? slugToName(parsed.slug) : null;

        setTimeout(() => {
          if (suggestedName) {
            askQuestion('full_name',
              lang === 'en'
                ? `Based on your LinkedIn, is your name **${suggestedName}**?`
                : `Seg\u00fan su LinkedIn, \u00bfsu nombre es **${suggestedName}**?`,
              [
                { label: lang === 'en' ? 'Yes, that\'s correct' : 'S\u00ed, es correcto', value: `__accept_name__${suggestedName}`, type: 'primary' },
                { label: lang === 'en' ? 'No, let me type it' : 'No, d\u00e9jeme escribirlo', value: '__reject_name__', type: 'secondary' },
              ]
            );
          } else {
            askQuestion('full_name', copy.askFullName);
          }
        }, 600);
        return true;
      }

      // Batched form phases - text input is not expected, but handle gracefully
      case 'licensing_form':
      case 'specialty_form':
      case 'education_form':
      case 'presence_form': {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Please use the form above to enter your information.'
            : 'Por favor use el formulario de arriba para ingresar su informaci\u00f3n.',
        });
        return true;
      }

      // Intellectual Phase (kept conversational)
      case 'researchgate_url': {
        if (!input || !input.includes('researchgate.net')) {
          stableAppendMessage({
            text: lang === 'en'
              ? 'Please enter a valid ResearchGate profile URL (e.g., https://www.researchgate.net/profile/Your-Name)'
              : 'Por favor ingresa una URL v\u00e1lida de ResearchGate (ej., https://www.researchgate.net/profile/Tu-Nombre)',
          });
          return true;
        }
        data.researchgateUrl = input;
        updateState('processing');

        try {
          const response = await fetch('/api/publications/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'researchgate', query: input }),
          });
          const result = await response.json();

          if (result.success && result.publications.length > 0) {
            stableAppendMessage({
              text: lang === 'en'
                ? `Found ${result.publications.length} publications! Select which ones to include in your profile:`
                : `\u00a1Encontramos ${result.publications.length} publicaciones! Selecciona cu\u00e1les incluir en tu perfil:`,
              showPublicationSelector: {
                publications: result.publications,
                source: 'researchgate',
                profileName: result.profileName,
              },
            } as OnboardingBotMessage);
            setQuestion('publications_select');
            updateState('awaiting_user');
          } else {
            stableAppendMessage({
              text: lang === 'en'
                ? 'Could not fetch publications from that profile. You can try another source or add manually.'
                : 'No se pudieron obtener publicaciones de ese perfil. Puedes probar otra fuente o agregar manualmente.',
              actions: [
                { label: lang === 'en' ? 'Try another source' : 'Probar otra fuente', value: 'retry', type: 'primary' },
                { label: lang === 'en' ? 'Skip publications' : 'Omitir publicaciones', value: 'skip', type: 'skip' },
              ],
            });
            setQuestion('publication_source');
            updateState('awaiting_user');
          }
        } catch {
          stableAppendMessage({ text: lang === 'en' ? 'Error fetching publications. Please try again.' : 'Error al obtener publicaciones. Por favor intenta de nuevo.' });
          updateState('awaiting_user');
        }
        return true;
      }

      case 'academia_url': {
        if (!input || !input.includes('academia.edu')) {
          stableAppendMessage({
            text: lang === 'en'
              ? 'Please enter a valid Academia.edu profile URL'
              : 'Por favor ingresa una URL v\u00e1lida de Academia.edu',
          });
          return true;
        }
        data.academiaEduUrl = input;
        updateState('processing');

        try {
          const response = await fetch('/api/publications/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'academia', query: input }),
          });
          const result = await response.json();

          if (result.success && result.publications.length > 0) {
            stableAppendMessage({
              text: lang === 'en'
                ? `Found ${result.publications.length} publications! Select which ones to include:`
                : `\u00a1Encontramos ${result.publications.length} publicaciones! Selecciona cu\u00e1les incluir:`,
              showPublicationSelector: {
                publications: result.publications,
                source: 'academia',
                profileName: result.profileName,
              },
            } as OnboardingBotMessage);
            setQuestion('publications_select');
            updateState('awaiting_user');
          } else {
            stableAppendMessage({
              text: lang === 'en'
                ? 'Could not fetch publications. Try another source or add manually.'
                : 'No se pudieron obtener publicaciones. Prueba otra fuente o agrega manualmente.',
              actions: [
                { label: lang === 'en' ? 'Try another source' : 'Probar otra fuente', value: 'retry', type: 'primary' },
                { label: lang === 'en' ? 'Skip' : 'Omitir', value: 'skip', type: 'skip' },
              ],
            });
            setQuestion('publication_source');
            updateState('awaiting_user');
          }
        } catch {
          stableAppendMessage({ text: lang === 'en' ? 'Error fetching publications.' : 'Error al obtener publicaciones.' });
          updateState('awaiting_user');
        }
        return true;
      }

      case 'pubmed_search': {
        if (!input || input.length < 3) {
          stableAppendMessage({
            text: lang === 'en'
              ? 'Please enter your name or ORCID ID'
              : 'Por favor ingresa tu nombre o ORCID ID',
          });
          return true;
        }
        updateState('processing');

        try {
          const response = await fetch('/api/publications/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'pubmed', query: input }),
          });
          const result = await response.json();

          if (result.success && result.publications.length > 0) {
            stableAppendMessage({
              text: lang === 'en'
                ? `Found ${result.publications.length} publications on PubMed! Select which ones to include:`
                : `\u00a1Encontramos ${result.publications.length} publicaciones en PubMed! Selecciona cu\u00e1les incluir:`,
              showPublicationSelector: {
                publications: result.publications,
                source: 'pubmed',
                profileName: result.profileName,
              },
            } as OnboardingBotMessage);
            setQuestion('publications_select');
            updateState('awaiting_user');
          } else {
            stableAppendMessage({
              text: lang === 'en'
                ? 'No publications found on PubMed for that name. Try a different format or add manually.'
                : 'No se encontraron publicaciones en PubMed para ese nombre. Prueba otro formato o agrega manualmente.',
              actions: [
                { label: lang === 'en' ? 'Try another source' : 'Probar otra fuente', value: 'retry', type: 'primary' },
                { label: lang === 'en' ? 'Skip' : 'Omitir', value: 'skip', type: 'skip' },
              ],
            });
            setQuestion('publication_source');
            updateState('awaiting_user');
          }
        } catch {
          stableAppendMessage({ text: lang === 'en' ? 'Error searching PubMed.' : 'Error al buscar en PubMed.' });
          updateState('awaiting_user');
        }
        return true;
      }

      case 'publications_manual':
      case 'publications_select': {
        return true;
      }

      case 'presentations': {
        if (input.toLowerCase() !== 'skip' && input) {
          data.presentations = input.split(/\n+/).map(p => ({
            title: p.trim(),
            conference: '',
          }));
        }
        askQuestion('books', copy.askBooks, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        return true;
      }

      case 'books': {
        if (input.toLowerCase() !== 'skip' && input) {
          data.books = input.split(/\n+/).map(b => ({
            title: b.trim(),
            role: 'author' as const,
          }));
        }
        stableAppendMessage({ text: copy.intellectualNote });
        setTimeout(() => startPresencePhase(), 600);
        return true;
      }

      // Confirmation Phase
      case 'confirm_profile': {
        return true;
      }

      case 'edit_choice': {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Let\'s start over. You can update any information.'
            : 'Comencemos de nuevo. Puede actualizar cualquier informaci\u00f3n.',
        });
        dataRef.current = { licenses: [], languages: ['es', 'en'] };
        setTimeout(() => {
          setPhase('identity');
          askQuestion('full_name', copy.askFullName);
        }, 500);
        return true;
      }

      default:
        return false;
    }
  }, [
    state, question, copy, lang, stableAppendMessage, askQuestion, updateState,
    startLicensingPhase, startIntellectualPhase, startPresencePhase,
    startConfirmationPhase,
  ]);

  // ── Handle action button clicks ──

  const handleActionClick = useCallback(async (value: string): Promise<boolean> => {
    const currentQuestion = question;
    const data = dataRef.current;

    switch (currentQuestion) {
      case 'has_linkedin':
        if (value === 'yes') {
          const effectiveData: LinkedInImportData | undefined = sessionLinkedInData
            ? {
                fullName: sessionLinkedInData.fullName ?? undefined,
                email: sessionLinkedInData.email ?? undefined,
                photoUrl: sessionLinkedInData.photoUrl ?? undefined,
              }
            : linkedInData;

          if (effectiveData && !linkedInApplied.current) {
            linkedInApplied.current = true;
            stableAppendMessage({
              text: lang === 'en'
                ? `Great! We pulled your information from LinkedIn. Please confirm the data below:`
                : `\u00a1Excelente! Obtuvimos tu informaci\u00f3n de LinkedIn. Por favor confirma los datos a continuaci\u00f3n:`,
              linkedInPreview: effectiveData,
            } as OnboardingBotMessage);

            if (effectiveData.fullName) {
              data.linkedinUrl = `https://linkedin.com/in/${sessionId || 'profile'}`;
              data.linkedinImported = true;
            }

            setQuestion('linkedin_confirm');
            updateState('awaiting_user');
          } else {
            stableAppendMessage({
              text: lang === 'en'
                ? 'You can connect your LinkedIn account using the button below, or simply paste your LinkedIn profile URL.'
                : 'Puedes conectar tu cuenta de LinkedIn con el bot\u00f3n de abajo, o simplemente pegar la URL de tu perfil de LinkedIn.',
              showLinkedInConnect: true,
            } as OnboardingBotMessage);

            askQuestion('linkedin_url',
              lang === 'en'
                ? 'Paste your LinkedIn profile URL here (e.g., https://linkedin.com/in/your-name):'
                : 'Pega la URL de tu perfil de LinkedIn aqu\u00ed (ej., https://linkedin.com/in/su-nombre):'
            );
          }
        } else {
          stableAppendMessage({
            text: lang === 'en'
              ? 'No problem at all. Let\'s get to know you the old-fashioned way.'
              : 'No hay problema. Conozc\u00e1mosle de la manera tradicional.',
          });
          setTimeout(() => {
            askQuestion('full_name', copy.askFullName);
          }, 800);
        }
        return true;

      case 'linkedin_confirm': {
        const confirmData: LinkedInImportData | undefined = sessionLinkedInData
          ? {
              fullName: sessionLinkedInData.fullName ?? undefined,
              email: sessionLinkedInData.email ?? undefined,
              photoUrl: sessionLinkedInData.photoUrl ?? undefined,
            }
          : linkedInData;

        if (value === 'linkedin_confirm' && confirmData) {
          if (confirmData.fullName) data.fullName = confirmData.fullName;
          if (confirmData.email) data.email = confirmData.email;
          if (confirmData.photoUrl) data.photoUrl = confirmData.photoUrl;
          if (confirmData.medicalSchool) data.medicalSchool = confirmData.medicalSchool;
          if (confirmData.graduationYear) data.graduationYear = confirmData.graduationYear;
          if (confirmData.currentInstitutions) data.currentInstitutions = confirmData.currentInstitutions;
          data.linkedinImported = true;

          stableAppendMessage({
            text: lang === 'en'
              ? `LinkedIn data confirmed!${confirmData.fullName ? ' We\'ve pre-filled your name' : ''}${confirmData.email ? ' and email' : ''}.`
              : `\u00a1Datos de LinkedIn confirmados!${confirmData.fullName ? ' Hemos pre-llenado tu nombre' : ''}${confirmData.email ? ' y correo' : ''}.`,
          });

          if (!confirmData.fullName) {
            setTimeout(() => {
              askQuestion('full_name', lang === 'en'
                ? 'What is your full name, as it appears on your medical license? (LinkedIn didn\'t provide this)'
                : '\u00bfCu\u00e1l es su nombre completo, tal como aparece en su licencia m\u00e9dica? (LinkedIn no proporcion\u00f3 esto)');
            }, 500);
          } else if (!confirmData.email) {
            setTimeout(() => {
              askQuestion('email', lang === 'en'
                ? 'What is your professional email address? (LinkedIn didn\'t provide this)'
                : '\u00bfCu\u00e1l es su correo electr\u00f3nico profesional? (LinkedIn no proporcion\u00f3 esto)');
            }, 500);
          } else {
            startLicensingPhase();
          }
          return true;
        } else if (value === 'linkedin_edit') {
          stableAppendMessage({
            text: lang === 'en'
              ? 'No problem! Let\'s enter your information manually.'
              : '\u00a1No hay problema! Ingresemos tu informaci\u00f3n manualmente.',
          });
          setTimeout(() => {
            askQuestion('full_name', copy.askFullName);
          }, 500);
          return true;
        }
        return true;
      }

      case 'full_name':
        if (value.startsWith('__accept_name__')) {
          const acceptedName = value.replace('__accept_name__', '');
          data.fullName = acceptedName;
          stableAppendMessage({
            text: lang === 'en'
              ? `Great, ${acceptedName}!`
              : `Perfecto, ${acceptedName}!`,
          });
          setTimeout(() => {
            askQuestion('email', lang === 'en' ? 'What is your professional email address?' : '\u00bfCu\u00e1l es su correo electr\u00f3nico profesional?');
          }, 400);
          return true;
        } else if (value === '__reject_name__') {
          askQuestion('full_name', copy.askFullName);
          return true;
        }
        break;

      case 'google_scholar':
        if (value === 'yes') {
          stableAppendMessage({
            text: lang === 'en'
              ? 'Great! How would you like to add your publications?'
              : '\u00a1Excelente! \u00bfC\u00f3mo te gustar\u00eda agregar tus publicaciones?',
            actions: [
              { label: 'ResearchGate', value: 'researchgate', type: 'secondary' },
              { label: 'Academia.edu', value: 'academia', type: 'secondary' },
              { label: 'PubMed', value: 'pubmed', type: 'secondary' },
              { label: lang === 'en' ? 'Manual entry' : 'Entrada manual', value: 'manual', type: 'secondary' },
            ],
          });
          setQuestion('publication_source');
          updateState('awaiting_user');
        } else {
          // Skip publications entirely, go to presence
          stableAppendMessage({ text: copy.intellectualNote });
          setTimeout(() => startPresencePhase(), 600);
        }
        return true;

      case 'publication_source':
        if (value === 'researchgate') {
          askQuestion('researchgate_url',
            lang === 'en'
              ? 'Please paste your ResearchGate profile URL:'
              : 'Por favor pega la URL de tu perfil de ResearchGate:'
          );
        } else if (value === 'academia') {
          askQuestion('academia_url',
            lang === 'en'
              ? 'Please paste your Academia.edu profile URL:'
              : 'Por favor pega la URL de tu perfil de Academia.edu:'
          );
        } else if (value === 'pubmed') {
          askQuestion('pubmed_search',
            lang === 'en'
              ? 'Enter your name as it appears on PubMed (e.g., "Smith John" or ORCID ID):'
              : 'Ingresa tu nombre como aparece en PubMed (ej., "Garc\u00eda Juan" o ORCID ID):'
          );
        } else if (value === 'manual') {
          stableAppendMessage({
            text: lang === 'en'
              ? 'Add your publications using the form below. Click Cancel when done.'
              : 'Agrega tus publicaciones usando el formulario. Haz clic en Cancelar cuando termines.',
            showManualPublicationForm: true,
          } as OnboardingBotMessage);
          setQuestion('publications_manual');
          updateState('awaiting_user');
        } else if (value === 'retry') {
          stableAppendMessage({
            text: lang === 'en'
              ? 'Choose a different source for your publications:'
              : 'Elige otra fuente para tus publicaciones:',
            actions: [
              { label: 'ResearchGate', value: 'researchgate', type: 'secondary' },
              { label: 'Academia.edu', value: 'academia', type: 'secondary' },
              { label: 'PubMed', value: 'pubmed', type: 'secondary' },
              { label: lang === 'en' ? 'Manual entry' : 'Entrada manual', value: 'manual', type: 'secondary' },
              { label: lang === 'en' ? 'Skip' : 'Omitir', value: 'skip', type: 'skip' },
            ],
          });
          updateState('awaiting_user');
        } else if (value === 'skip') {
          // Skip publications, move to presentations
          askQuestion('presentations', copy.askPresentations, [
            { label: copy.skipPrompt, value: 'skip', type: 'skip' },
          ]);
        }
        return true;

      case 'publications_select':
      case 'publications_manual':
        if (value === 'publications_cancel' || value === 'publications_done') {
          const pubCount = dataRef.current.publications?.length || 0;
          stableAppendMessage({
            text: pubCount > 0
              ? (lang === 'en' ? `Great! ${pubCount} publication(s) added to your profile.` : `\u00a1Excelente! ${pubCount} publicaci\u00f3n(es) agregadas a tu perfil.`)
              : (lang === 'en' ? 'No publications added.' : 'No se agregaron publicaciones.'),
          });
          askQuestion('presentations', copy.askPresentations, [
            { label: copy.skipPrompt, value: 'skip', type: 'skip' },
          ]);
        }
        return true;

      case 'presentations':
        if (value === 'skip') {
          return handleUserInput('skip');
        }
        break;

      case 'books':
        if (value === 'skip') {
          return handleUserInput('skip');
        }
        break;

      case 'confirm_profile':
        if (value === 'confirm') {
          await completeOnboarding();
        } else if (value === 'edit') {
          setQuestion('edit_choice');
          askQuestion('edit_choice', copy.editPrompt);
        }
        return true;
    }

    return false;
  }, [
    question, lang, copy, askQuestion, handleUserInput, updateState,
    startLicensingPhase, startPresencePhase, completeOnboarding,
    linkedInData, sessionLinkedInData, sessionId, stableAppendMessage,
  ]);

  // Start the onboarding
  const start = useCallback(() => {
    if (state !== 'idle') return;
    dataRef.current = { licenses: [], languages: ['es', 'en'] };
    startBriefing();
  }, [state, startBriefing]);

  // Handle publication selection from PublicationSelector component
  const handlePublicationSelection = useCallback((publications: import('../lib/publications').Publication[]) => {
    dataRef.current.publications = publications.map(p => ({
      title: p.title,
      journal: p.journal,
      year: p.year,
      url: p.url || (p.doi ? `https://doi.org/${p.doi}` : undefined),
    }));

    stableAppendMessage({
      text: lang === 'en'
        ? `Added ${publications.length} publications to your profile.`
        : `Se agregaron ${publications.length} publicaciones a tu perfil.`,
    });

    askQuestion('presentations', copy.askPresentations, [
      { label: copy.skipPrompt, value: 'skip', type: 'skip' },
    ]);
  }, [lang, stableAppendMessage, copy, askQuestion]);

  // Handle manual publication entry
  const handleManualPublication = useCallback((publication: import('../lib/publications').Publication) => {
    const existing = dataRef.current.publications || [];
    dataRef.current.publications = [
      ...existing,
      {
        title: publication.title,
        journal: publication.journal,
        year: publication.year,
        url: publication.url || (publication.doi ? `https://doi.org/${publication.doi}` : undefined),
      },
    ];

    stableAppendMessage({
      text: lang === 'en'
        ? `Added: "${publication.title}". Add another or click Cancel when done.`
        : `Agregado: "${publication.title}". Agrega otro o haz clic en Cancelar cuando termines.`,
      showManualPublicationForm: true,
    } as OnboardingBotMessage);
  }, [lang, stableAppendMessage]);

  // Update toggle data (kept for backward compatibility)
  const updateToggleData = useCallback((_values: string[]) => {
    // No longer used for batched forms, but kept for interface compatibility
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    start,
    isActive: () => state !== 'idle' && state !== 'completed',
    isAwaitingInput: () => state === 'awaiting_user',
    handleUserInput,
    handleActionClick,
    handlePublicationSelection,
    handleManualPublication,
    updateToggleData,
    handleLicensingSubmit,
    handleSpecialtySubmit,
    handleEducationSubmit,
    handlePresenceSubmit,
    handleFormCancel,
    getCollectedData: () => ({ ...dataRef.current }),
    getLicensedCountryCodes: () =>
      (dataRef.current.licenses || []).map((l) => l.countryCode).filter(Boolean),
  }));

  return null;
});

PhysicianOnboardingAgent.displayName = 'PhysicianOnboardingAgent';

export default PhysicianOnboardingAgent;
