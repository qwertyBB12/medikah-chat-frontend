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
  | 'title'
  | 'email'
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

interface PhysicianOnboardingAgentProps {
  lang: SupportedLang;
  appendMessage: (message: OnboardingBotMessage) => void;
  onStateChange?: (state: OnboardingAgentState) => void;
  onProfileReady?: (physicianId: string, physicianName: string) => void;
  onPhaseChange?: (phase: string) => void;
}

// Validation helpers
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  const { lang, appendMessage, onStateChange, onProfileReady, onPhaseChange } = props;
  const copy = useMemo(() => onboardingCopy[lang], [lang]);

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

  // Ask the honorific (Dr/Dra). Framed as a form of address, not a gender question —
  // standard and expected in the Mexican market. Drives the gendered @medikah.health
  // mailbox (dra-/dr-) and the public profile; NEVER inferred from a name.
  const askTitle = useCallback(() => {
    askQuestion(
      'title',
      lang === 'en'
        ? 'How would you like patients to address you?'
        : '¿Cómo desea que los pacientes se dirijan a usted?',
      [
        { label: 'Doctor (Dr.)', value: 'Dr', type: 'primary' },
        { label: 'Doctora (Dra.)', value: 'Dra', type: 'primary' },
      ],
    );
  }, [askQuestion, lang]);

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

    // Go directly to country selection
    setTimeout(() => {
      startCountrySelectionPhase();
    }, 5800);
  }, [copy, stableAppendMessage, updateState, getTimeBasedGreeting, startCountrySelectionPhase]);

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
      title: dataRef.current.title,
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
        askTitle();
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

      // Honorific — choose via the buttons, not free text.
      case 'title': {
        stableAppendMessage({
          text: lang === 'en'
            ? 'Please tap Doctor (Dr.) or Doctora (Dra.) above.'
            : 'Por favor toque Doctor (Dr.) o Doctora (Dra.) arriba.',
        });
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
    state, question, copy, lang, stableAppendMessage, askQuestion, askTitle, updateState,
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
            askTitle();
          }, 400);
          return true;
        } else if (value === '__reject_name__') {
          askQuestion('full_name', copy.askFullName);
          return true;
        }
        break;

      // Honorific (Dr/Dra) \u2014 two-button step between name and email.
      case 'title': {
        if (value === 'Dr' || value === 'Dra') {
          data.title = value;
          stableAppendMessage({
            text: lang === 'en'
              ? `Noted \u2014 ${value}.`
              : `Anotado \u2014 ${value}.`,
          });
          setTimeout(() => {
            askQuestion(
              'email',
              lang === 'en'
                ? 'What is your professional email address?'
                : '\u00bfCu\u00e1l es su correo electr\u00f3nico profesional?',
            );
          }, 400);
          return true;
        }
        return true;
      }

      case 'attest_confirm': {
        if (value === 'attest_confirm') {
          await completeOnboarding();
        }
        return true;
      }
    }

    return false;
  }, [
    question, lang, copy, askQuestion, askTitle, updateState,
    startCountrySelectionPhase, startSpecialtyPhase, completeOnboarding,
    stableAppendMessage,
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
  const updateToggleData = useCallback((...args: unknown[]) => {
    // Called as (values[]) from __done__ button, or (key, values[]) from toggle click
    const values = Array.isArray(args[0]) ? args[0] as string[] : Array.isArray(args[1]) ? args[1] as string[] : [];
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
