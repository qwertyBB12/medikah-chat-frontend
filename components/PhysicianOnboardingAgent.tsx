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
  submitAttestation,
} from '../lib/physicianClient';

// Country code allowlist — T-04-03 mitigation
const VALID_COUNTRY_CODES = ['US', 'MX', 'CO', 'CA', 'OTHER'] as const;
type ValidCountryCode = typeof VALID_COUNTRY_CODES[number];

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
  // Batched form rendering — kept for specialty phase
  showBatchedForm?: 'specialty';
}

// Phases (v1.1 lightweight flow — 4-5 exchanges)
export type OnboardingPhase =
  | 'briefing'
  | 'country_selection'   // first real question after greeting
  | 'identity'
  | 'specialty'
  | 'attestation'         // summary + confirm
  | 'completed';

// Questions within each phase
type QuestionKey =
  // Country selection
  | 'country_selection'
  // Identity
  | 'full_name'
  | 'email'
  | 'has_linkedin'
  | 'linkedin_url'
  | 'linkedin_confirm'
  // Specialty (batched form)
  | 'specialty_form'
  // Attestation
  | 'attest_confirm';

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
  // Batched form callbacks (specialty kept; others deferred to Phase 7 dashboard)
  handleLicensingSubmit?: (data: { licenses: PhysicianLicense[] }) => void;
  handleSpecialtySubmit?: (data: { primarySpecialty: string; subSpecialties: string[]; boardCertifications: BoardCertification[] }) => void;
  handleEducationSubmit?: (data: { medicalSchool: string; medicalSchoolCountry: string; graduationYear: number; honors: string[]; residency: Residency[]; fellowships: Fellowship[] }) => void;
  handlePresenceSubmit?: (data: {
    currentInstitutions: string[]; websiteUrl?: string; twitterUrl?: string;
    researchgateUrl?: string; academiaEduUrl?: string;
    availableDays: string[]; availableHoursStart: string; availableHoursEnd: string;
    timezone: string; languages: string[];
  }) => void;
  handleNarrativeSubmit?: (data: {
    firstConsultExpectation: string; communicationStyle: string;
    specialtyMotivation: string; careValues: string;
    originSentence: string; personalStatement: string;
    personalInterests: string;
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
  onPhaseChange?: (phase: string) => void;
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

/** Country code label map */
const COUNTRY_LABELS: Record<ValidCountryCode, string> = {
  US: 'United States',
  MX: 'Mexico',
  CO: 'Colombia',
  CA: 'Canada',
  OTHER: 'Other',
};

const PhysicianOnboardingAgent = forwardRef<
  PhysicianOnboardingAgentHandle,
  PhysicianOnboardingAgentProps
>((props, ref) => {
  const { lang, appendMessage, onStateChange, onProfileReady, onPhaseChange, linkedInData, sessionId, sessionLinkedInData } = props;
  const copy = useMemo(() => onboardingCopy[lang], [lang]);

  const linkedInApplied = useRef(false);
  const appendMessageRef = useRef(appendMessage);
  const onStateChangeRef = useRef(onStateChange);
  const onPhaseChangeRef = useRef(onPhaseChange);

  useEffect(() => { appendMessageRef.current = appendMessage; }, [appendMessage]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);

  // State
  const [state, setState] = useState<OnboardingAgentState>('idle');
  const [phase, setPhase] = useState<OnboardingPhase>('briefing');
  const [question, setQuestion] = useState<QuestionKey | null>(null);

  // Toggle state for country selection
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChangeRef.current?.(phase);
  }, [phase]);

  // Collected data
  const dataRef = useRef<Partial<PhysicianProfileData>>({
    licenses: [],
    languages: ['es', 'en'],
    countryOfPractice: [],
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

  // Generate attestation summary text
  const generateAttestationSummary = useCallback((): string => {
    const data = dataRef.current;
    const lines: string[] = [];

    lines.push(`**${copy.profileSummaryTitle}**\n`);

    if (data.fullName) lines.push(`**${lang === 'en' ? 'Name' : 'Nombre'}:** ${data.fullName}`);
    if (data.email) lines.push(`**Email:** ${data.email}`);
    if (data.photoUrl) lines.push(`**${lang === 'en' ? 'Photo' : 'Foto'}:** ${lang === 'en' ? 'Uploaded' : 'Subida'}`);

    if (data.countryOfPractice && data.countryOfPractice.length > 0) {
      const countryLabels = data.countryOfPractice.map(code => {
        if (code in COUNTRY_LABELS) return COUNTRY_LABELS[code as ValidCountryCode];
        return code;
      });
      lines.push(`**${lang === 'en' ? 'Countries of Practice' : 'Paises de Practica'}:** ${countryLabels.join(', ')}`);
    }

    if (data.primarySpecialty) lines.push(`**${lang === 'en' ? 'Primary Specialty' : 'Especialidad Principal'}:** ${data.primarySpecialty}`);

    return lines.join('\n');
  }, [copy.profileSummaryTitle, lang]);

  // ── Phase transitions ──

  const startCountrySelectionPhase = useCallback(() => {
    setPhase('country_selection');
    setSelectedCountries([]);

    const countryActions: OnboardingAction[] = [
      { label: 'United States', value: 'US', type: 'toggle', selected: false },
      { label: 'Mexico', value: 'MX', type: 'toggle', selected: false },
      { label: 'Colombia', value: 'CO', type: 'toggle', selected: false },
      { label: lang === 'en' ? 'Canada' : 'Canada', value: 'CA', type: 'toggle', selected: false },
      { label: lang === 'en' ? 'Other country' : 'Otro pais', value: 'OTHER', type: 'toggle', selected: false },
    ];

    const continueAction: OnboardingAction = {
      label: lang === 'en' ? 'Continue' : 'Continuar',
      value: 'country_confirm',
      type: 'primary',
    };

    setQuestion('country_selection');
    updateState('awaiting_user');

    stableAppendMessage({
      text: `${copy.askCountryOfPractice}\n\n_${copy.countrySelectionNote}_`,
      actions: [...countryActions, continueAction],
    });
  }, [lang, copy, stableAppendMessage, updateState]);

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
    // skip full briefing and go straight to LinkedIn confirmation.
    // Country selection appears AFTER LinkedIn data is confirmed (Pitfall 1 in RESEARCH.md).
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
  }, [copy, stableAppendMessage, updateState, getTimeBasedGreeting, linkedInData, sessionLinkedInData, lang, sessionId, startCountrySelectionPhase]);

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

  const startAttestationPhase = useCallback(() => {
    setPhase('attestation');

    stableAppendMessage({ text: copy.attestationTitle });

    setTimeout(() => {
      const summary = generateAttestationSummary();
      stableAppendMessage({
        text: summary,
        isSummary: true,
        summaryData: dataRef.current,
      });

      setTimeout(() => {
        stableAppendMessage({
          text: copy.attestationStatement,
          actions: [
            {
              label: copy.attestationConfirmButton,
              value: 'attest_confirm',
              type: 'primary',
            },
          ],
        });
        setQuestion('attest_confirm');
        updateState('awaiting_user');
      }, 800);
    }, 1200);
  }, [copy, generateAttestationSummary, stableAppendMessage, updateState]);

  const completeOnboarding = useCallback(async () => {
    updateState('processing');

    stableAppendMessage({
      text: lang === 'en'
        ? 'Submitting your profile...'
        : 'Enviando su perfil...',
    });

    // Validate country codes against allowlist (T-04-03)
    const rawCountries = dataRef.current.countryOfPractice || [];
    const validatedCountries = rawCountries.filter(
      (c): c is string => VALID_COUNTRY_CODES.includes(c as ValidCountryCode)
    );

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
      countryOfPractice: validatedCountries,
      languages: dataRef.current.languages || ['es', 'en'],
      onboardingLanguage: lang,
    };

    const result = await createPhysicianProfile(profileData);

    if (result.success && result.physicianId) {
      const physicianId = result.physicianId;

      // Submit attestation record (Plan 01 — T-04-07 non-repudiation)
      const attestResult = await submitAttestation({
        physicianId,
        dataSnapshot: dataRef.current as Record<string, unknown>,
        language: lang,
        attestationVersion: '1.0',
      });

      if (!attestResult.success) {
        console.warn('Attestation record save failed:', attestResult.error);
        // Non-blocking — profile was created, log the warning and continue
      }

      await logOnboardingAudit({
        physicianId,
        email: profileData.email,
        action: 'completed',
        phase: 'attestation',
        dataSnapshot: profileData as unknown as Record<string, unknown>,
        language: lang,
      });

      setPhase('completed');
      updateState('completed');

      const successMessage = copy.attestationSuccessMessage.replace(
        '{name}',
        profileData.fullName.split(' ')[0] || profileData.fullName
      );

      stableAppendMessage({ text: successMessage });

      setTimeout(() => {
        onProfileReady?.(physicianId, profileData.fullName);
      }, 800);
    } else {
      stableAppendMessage({
        text: lang === 'en'
          ? 'There was an issue saving your profile. Please try again or contact support@medikah.health.'
          : 'Hubo un problema al guardar su perfil. Por favor intente de nuevo o contacte support@medikah.health.',
      });
      updateState('awaiting_user');
    }
  }, [lang, copy, stableAppendMessage, updateState, onProfileReady]);

  // ── Batched form handlers ──

  const handleSpecialtySubmit = useCallback((formData: {
    primarySpecialty: string;
    subSpecialties: string[];
    boardCertifications: BoardCertification[];
  }) => {
    dataRef.current.primarySpecialty = formData.primarySpecialty;
    dataRef.current.subSpecialties = formData.subSpecialties;
    dataRef.current.boardCertifications = formData.boardCertifications;
    stableAppendMessage({ text: copy.specialtyNote });
    setTimeout(() => startAttestationPhase(), 600);
  }, [copy, stableAppendMessage, startAttestationPhase]);

  const handleFormCancel = useCallback(() => {
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
      // Country selection — text input handled via action buttons; guard gracefully
      case 'country_selection': {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Please tap a country button to select it, then tap Continue.'
            : 'Por favor toque un boton de pais para seleccionarlo, luego toque Continuar.',
        });
        return true;
      }

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

        // After identity, go to specialty
        startSpecialtyPhase();
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

      // Batched form phase — text input not expected
      case 'specialty_form': {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Please use the form above to enter your information.'
            : 'Por favor use el formulario de arriba para ingresar su informaci\u00f3n.',
        });
        return true;
      }

      // Attestation — handled via action button only
      case 'attest_confirm': {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Please tap "Confirm and Submit" to complete your registration.'
            : 'Por favor toque "Confirmar y Enviar" para completar su registro.',
        });
        return true;
      }

      default:
        return false;
    }
  }, [
    state, question, copy, lang, stableAppendMessage, askQuestion, updateState,
    startSpecialtyPhase,
  ]);

  // ── Handle action button clicks ──

  const handleActionClick = useCallback(async (value: string): Promise<boolean> => {
    const currentQuestion = question;
    const data = dataRef.current;

    switch (currentQuestion) {
      case 'country_selection': {
        if (value === 'country_confirm') {
          // Validate and store selected countries
          const validatedCountries = selectedCountries.filter(
            (c): c is string => VALID_COUNTRY_CODES.includes(c as ValidCountryCode)
          );

          if (validatedCountries.length === 0) {
            stableAppendMessage({
              text: lang === 'en'
                ? 'Please select at least one country before continuing.'
                : 'Por favor seleccione al menos un pais antes de continuar.',
            });
            return true;
          }

          data.countryOfPractice = validatedCountries;

          const countryLabels = validatedCountries.map(code =>
            code in COUNTRY_LABELS ? COUNTRY_LABELS[code as ValidCountryCode] : code
          );

          stableAppendMessage({
            text: lang === 'en'
              ? `Selected: ${countryLabels.join(', ')}. Let's continue.`
              : `Seleccionado: ${countryLabels.join(', ')}. Continuemos.`,
          });

          // Show country-specific identity hint if applicable
          const hasMX = validatedCountries.includes('MX');
          const hasUS = validatedCountries.includes('US');
          if (hasMX || hasUS) {
            const hint = hasMX ? copy.identityDocMX : copy.identityDocUS;
            setTimeout(() => {
              stableAppendMessage({ text: hint });
            }, 600);
          }

          // Transition to identity phase
          setTimeout(() => {
            setPhase('identity');
            askQuestion('full_name', copy.askFullName);
          }, hasMX || hasUS ? 1400 : 800);

          return true;
        }

        // Toggle country selection
        if (VALID_COUNTRY_CODES.includes(value as ValidCountryCode)) {
          setSelectedCountries(prev => {
            const updated = prev.includes(value)
              ? prev.filter(c => c !== value)
              : [...prev, value];
            return updated;
          });
          return true;
        }
        return true;
      }

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
          // Go to country selection first (D-08), then identity
          setTimeout(() => {
            startCountrySelectionPhase();
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

          // After LinkedIn confirm, go to country selection (Pitfall 1 from RESEARCH.md)
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
            // Both name and email are available — go to country selection
            setTimeout(() => {
              startCountrySelectionPhase();
            }, 500);
          }
          return true;
        } else if (value === 'linkedin_edit') {
          stableAppendMessage({
            text: lang === 'en'
              ? 'No problem! Let\'s enter your information manually.'
              : '\u00a1No hay problema! Ingresemos tu informaci\u00f3n manualmente.',
          });
          setTimeout(() => {
            startCountrySelectionPhase();
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

      case 'attest_confirm': {
        if (value === 'attest_confirm') {
          await completeOnboarding();
        }
        return true;
      }
    }

    return false;
  }, [
    question, lang, copy, askQuestion, updateState,
    startCountrySelectionPhase, startSpecialtyPhase, completeOnboarding,
    linkedInData, sessionLinkedInData, sessionId, stableAppendMessage,
    selectedCountries,
  ]);

  // Start the onboarding
  const start = useCallback(() => {
    if (state !== 'idle') return;
    dataRef.current = { licenses: [], languages: ['es', 'en'], countryOfPractice: [] };
    setSelectedCountries([]);
    startBriefing();
  }, [state, startBriefing]);

  // Update toggle data — used for country selection from the parent renderer
  const updateToggleData = useCallback((values: string[]) => {
    // Validate against allowlist before setting
    const validated = values.filter(v => VALID_COUNTRY_CODES.includes(v as ValidCountryCode));
    setSelectedCountries(validated);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    start,
    isActive: () => state !== 'idle' && state !== 'completed',
    isAwaitingInput: () => state === 'awaiting_user',
    handleUserInput,
    handleActionClick,
    updateToggleData,
    // Specialty form — still used in the lightweight flow
    handleSpecialtySubmit,
    handleFormCancel,
    // The following are no longer part of the onboarding flow (deferred to Phase 7 dashboard)
    // but are kept in the interface for backward compatibility
    handleLicensingSubmit: undefined,
    handleEducationSubmit: undefined,
    handlePresenceSubmit: undefined,
    handleNarrativeSubmit: undefined,
    getCollectedData: () => ({ ...dataRef.current }),
    getLicensedCountryCodes: () =>
      (dataRef.current.countryOfPractice || []).filter(Boolean),
  }));

  return null;
});

PhysicianOnboardingAgent.displayName = 'PhysicianOnboardingAgent';

export default PhysicianOnboardingAgent;
