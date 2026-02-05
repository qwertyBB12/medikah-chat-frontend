import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { SupportedLang } from '../lib/i18n';
import {
  onboardingCopy,
  LICENSED_COUNTRIES,
  US_STATES,
  MEDICAL_SPECIALTIES,
  AMERICAS_TIMEZONES,
  DAYS_OF_WEEK,
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
  type?: 'primary' | 'secondary' | 'skip';
}

export interface OnboardingBotMessage {
  text: string;
  actions?: OnboardingAction[];
  isVision?: boolean; // For inspirational/vision messages
  showLinkedInConnect?: boolean; // Show LinkedIn OAuth connect button
  linkedInPreview?: { // Show LinkedIn data for confirmation
    fullName?: string;
    email?: string;
    photoUrl?: string;
    medicalSchool?: string;
    graduationYear?: number;
    currentInstitutions?: string[];
  };
  showPublicationSelector?: { // Show publication selection UI
    publications: import('../lib/publications').Publication[];
    source: import('../lib/publications').PublicationSource;
    profileName?: string;
  };
  showManualPublicationForm?: boolean; // Show manual publication entry form
  isSummary?: boolean; // For profile summary display
  summaryData?: Partial<PhysicianProfileData>;
}

// Phases
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

// Questions within each phase
type QuestionKey =
  // Identity
  | 'full_name'
  | 'email'
  | 'has_linkedin'
  | 'linkedin_url'
  | 'linkedin_confirm'
  | 'linkedin_permission'
  | 'photo_upload'
  // Licensing
  | 'countries_licensed'
  | 'license_number'
  | 'usa_states'
  // Specialty
  | 'primary_specialty'
  | 'sub_specialties'
  | 'board_certifications'
  // Education
  | 'medical_school'
  | 'medical_school_country'
  | 'graduation_year'
  | 'honors'
  | 'residency_institution'
  | 'residency_years'
  | 'fellowships'
  // Intellectual
  | 'google_scholar'
  | 'publication_source'
  | 'pubmed_search'
  | 'researchgate_url'
  | 'academia_url'
  | 'publications_manual'
  | 'publications_select'
  | 'publications'
  | 'presentations'
  | 'books'
  // Presence
  | 'current_institutions'
  | 'website'
  | 'social_profiles'
  | 'available_days'
  | 'available_hours'
  | 'timezone'
  | 'languages'
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
}

// Validation helpers
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidYear(value: string): boolean {
  const year = parseInt(value, 10);
  return !isNaN(year) && year >= 1950 && year <= new Date().getFullYear();
}

const PhysicianOnboardingAgent = forwardRef<
  PhysicianOnboardingAgentHandle,
  PhysicianOnboardingAgentProps
>((props, ref) => {
  const { lang, appendMessage, onStateChange, onProfileReady, linkedInData, sessionId } = props;
  const copy = useMemo(() => onboardingCopy[lang], [lang]);

  // Track if LinkedIn data has been applied
  const linkedInApplied = useRef(false);

  // State
  const [state, setState] = useState<OnboardingAgentState>('idle');
  const [_phase, setPhase] = useState<OnboardingPhase>('briefing');
  const [question, setQuestion] = useState<QuestionKey | null>(null);

  // Collected data
  const dataRef = useRef<Partial<PhysicianProfileData>>({
    licenses: [],
    languages: ['es', 'en'],
  });

  // Temporary state for multi-step questions
  const tempRef = useRef<{
    currentCountry?: string;
    currentLicense?: Partial<PhysicianLicense>;
    pendingCountries?: string[];
    currentResidency?: Partial<Residency>;
    currentFellowship?: Partial<Fellowship>;
  }>({});

  const updateState = useCallback((next: OnboardingAgentState) => {
    setState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  const askQuestion = useCallback((key: QuestionKey, message: string, actions?: OnboardingAction[]) => {
    setQuestion(key);
    updateState('awaiting_user');
    appendMessage({ text: message, actions });
  }, [updateState, appendMessage]);

  const showVisionMessage = useCallback((message: string) => {
    appendMessage({ text: message, isVision: true });
  }, [appendMessage]);

  // Generate profile summary
  const generateProfileSummary = useCallback((): string => {
    const data = dataRef.current;
    const lines: string[] = [];

    lines.push(`**${copy.profileSummaryTitle}**\n`);

    // Identity
    if (data.fullName) lines.push(`**Name:** ${data.fullName}`);
    if (data.email) lines.push(`**Email:** ${data.email}`);
    if (data.linkedinUrl) lines.push(`**LinkedIn:** ${data.linkedinUrl}`);

    // Licensing
    if (data.licenses && data.licenses.length > 0) {
      lines.push(`\n**Licenses:**`);
      data.licenses.forEach(lic => {
        const stateInfo = lic.state ? ` (${lic.state})` : '';
        lines.push(`- ${lic.country}${stateInfo}: ${lic.number}`);
      });
    }

    // Specialty
    if (data.primarySpecialty) lines.push(`\n**Primary Specialty:** ${data.primarySpecialty}`);
    if (data.subSpecialties?.length) lines.push(`**Sub-specialties:** ${data.subSpecialties.join(', ')}`);
    if (data.boardCertifications?.length) {
      lines.push(`**Board Certifications:**`);
      data.boardCertifications.forEach(cert => {
        lines.push(`- ${cert.board}: ${cert.certification}${cert.year ? ` (${cert.year})` : ''}`);
      });
    }

    // Education
    if (data.medicalSchool) {
      lines.push(`\n**Medical School:** ${data.medicalSchool}${data.medicalSchoolCountry ? `, ${data.medicalSchoolCountry}` : ''}${data.graduationYear ? ` (${data.graduationYear})` : ''}`);
    }
    if (data.honors?.length) lines.push(`**Honors:** ${data.honors.join(', ')}`);

    // Training
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

    // Intellectual
    if (data.googleScholarUrl) lines.push(`\n**Google Scholar:** ${data.googleScholarUrl}`);
    if (data.publications?.length) lines.push(`**Publications:** ${data.publications.length} listed`);
    if (data.presentations?.length) lines.push(`**Presentations:** ${data.presentations.length} listed`);

    // Presence
    if (data.currentInstitutions?.length) {
      lines.push(`\n**Current Practice:** ${data.currentInstitutions.join(', ')}`);
    }
    if (data.websiteUrl) lines.push(`**Website:** ${data.websiteUrl}`);

    // Availability
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

  // Get time-based greeting
  const getTimeBasedGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return copy.greetingMorning;
    if (hour < 18) return copy.greetingAfternoon;
    return copy.greetingEvening;
  }, [copy]);

  // Phase handlers
  const startBriefing = useCallback(() => {
    setPhase('briefing');
    updateState('briefing');

    // Conversational opening sequence
    // Only truly inspirational/mission statements get isVision styling
    const messages: Array<{ text: string; isVision?: boolean; delay: number }> = [
      { text: getTimeBasedGreeting(), delay: 0 },
      { text: copy.howAreYou, delay: 1200 },
      { text: copy.sessionIntro, delay: 2400 },
      { text: copy.sessionOverview, delay: 4000 },
    ];

    // Queue the opening messages
    messages.forEach(({ text, isVision, delay }) => {
      setTimeout(() => {
        appendMessage({ text, isVision });
      }, delay);
    });

    // After opening, ask for LinkedIn first (this is the key entry point)
    setTimeout(() => {
      setPhase('identity');
      setQuestion('has_linkedin');
      updateState('awaiting_user');
      appendMessage({
        text: copy.askLinkedIn,
        actions: [
          { label: copy.yes, value: 'yes', type: 'primary' },
          { label: copy.no, value: 'no', type: 'secondary' },
        ],
      });
    }, 5800);
  }, [copy, appendMessage, updateState, getTimeBasedGreeting]);

  const startLicensingPhase = useCallback(() => {
    setPhase('licensing');
    updateState('processing');

    // Transition to licensing with context
    appendMessage({ text: copy.phase2Vision, isVision: true });

    setTimeout(() => {
      const countryActions: OnboardingAction[] = LICENSED_COUNTRIES.slice(0, 6).map(c => ({
        label: c.name,
        value: c.code,
        type: 'secondary',
      }));
      askQuestion('countries_licensed', copy.askCountriesLicensed, countryActions);
    }, 1200);
  }, [copy, appendMessage, askQuestion, updateState]);

  const startSpecialtyPhase = useCallback(() => {
    setPhase('specialty');
    updateState('processing');

    // Transition message
    appendMessage({
      text: lang === 'en'
        ? 'Now let\'s talk about your expertise. This helps patients find the right specialist.'
        : 'Ahora hablemos de su especialidad. Esto ayuda a los pacientes a encontrar al especialista adecuado.',
    });

    setTimeout(() => {
      const specialtyActions: OnboardingAction[] = MEDICAL_SPECIALTIES.slice(0, 4).map(s => ({
        label: s,
        value: s,
        type: 'secondary',
      }));
      askQuestion('primary_specialty', copy.askPrimarySpecialty, specialtyActions);
    }, 1000);
  }, [copy, lang, appendMessage, askQuestion, updateState]);

  const startEducationPhase = useCallback(() => {
    setPhase('education');
    askQuestion('medical_school', copy.askMedicalSchool);
  }, [copy, askQuestion]);

  const startIntellectualPhase = useCallback(() => {
    setPhase('intellectual');
    showVisionMessage(copy.phase5Vision);
    setTimeout(() => {
      askQuestion('google_scholar', copy.askGoogleScholar, [
        { label: copy.yes, value: 'yes', type: 'primary' },
        { label: copy.no, value: 'no', type: 'secondary' },
      ]);
    }, 600);
  }, [copy, showVisionMessage, askQuestion]);

  const startPresencePhase = useCallback(() => {
    setPhase('presence');
    askQuestion('current_institutions', copy.askCurrentInstitutions);
  }, [copy, askQuestion]);

  const startConfirmationPhase = useCallback(() => {
    setPhase('confirmation');

    // Transition to confirmation
    appendMessage({ text: copy.phase7Vision });

    setTimeout(() => {
      const summary = generateProfileSummary();
      appendMessage({
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
  }, [copy, generateProfileSummary, appendMessage, askQuestion]);

  const completeOnboarding = useCallback(async () => {
    updateState('processing');

    // Show message about the agreement
    appendMessage({
      text: lang === 'en'
        ? 'Excellent! Your profile is ready. Before we finalize your registration, please review and sign the Physician Network Agreement.'
        : '¡Excelente! Su perfil está listo. Antes de finalizar su registro, por favor revise y firme el Acuerdo de Red de Médicos.',
      isVision: true,
    });

    // Create the physician profile
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
      // Log profile creation (not yet completed - pending consent)
      await logOnboardingAudit({
        physicianId: result.physicianId,
        email: profileData.email,
        action: 'phase_completed',
        phase: 'profile_created',
        dataSnapshot: profileData as unknown as Record<string, unknown>,
        language: lang,
      });

      // Trigger consent modal - completion happens after consent is signed
      // Confirmation email will be sent after consent
      const physicianId = result.physicianId;
      setTimeout(() => {
        onProfileReady?.(physicianId, profileData.fullName);
      }, 800);

      // Keep state as processing - will be updated after consent
      setPhase('confirmation');
    } else {
      appendMessage({
        text: lang === 'en'
          ? 'There was an issue saving your profile. Please try again or contact support@medikah.health.'
          : 'Hubo un problema al guardar su perfil. Por favor intente de nuevo o contacte support@medikah.health.',
      });
      updateState('awaiting_user');
    }
  }, [lang, appendMessage, updateState, onProfileReady]);

  // Handle user input
  const handleUserInput = useCallback(async (rawInput: string): Promise<boolean> => {
    if (state === 'idle' || state === 'completed' || state === 'processing') {
      return false;
    }

    const input = rawInput.trim();
    const currentQuestion = question;

    if (!currentQuestion) {
      return false;
    }

    const data = dataRef.current;

    switch (currentQuestion) {
      // Identity Phase
      case 'full_name': {
        if (!input || input.length < 3) {
          appendMessage({ text: copy.invalidName });
          return true;
        }
        data.fullName = input;
        askQuestion('email', lang === 'en' ? 'What is your professional email address?' : '¿Cuál es su correo electrónico profesional?');
        break;
      }

      case 'email': {
        if (!isValidEmail(input)) {
          appendMessage({ text: copy.invalidEmail });
          return true;
        }

        // Check if email already exists (with timeout to prevent hanging)
        try {
          const existsPromise = checkPhysicianEmailExists(input);
          const timeoutPromise = new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          );
          const exists = await Promise.race([existsPromise, timeoutPromise]);

          if (exists) {
            appendMessage({
              text: lang === 'en'
                ? 'This email is already registered in our network. Please use a different email or contact support if this is an error.'
                : 'Este correo ya está registrado en nuestra red. Por favor use un correo diferente o contacte soporte si esto es un error.',
            });
            return true;
          }
        } catch (error) {
          // Continue even if check fails - we'll catch duplicates on save
          console.warn('Email check failed, continuing:', error);
        }

        data.email = input.toLowerCase();

        // Log that onboarding started (fire and forget, don't block flow)
        logOnboardingAudit({
          email: data.email,
          action: 'started',
          phase: 'identity',
          language: lang,
        }).catch(err => console.warn('Audit log failed:', err));

        // Proceed to licensing phase (return early to avoid setQuestion(null))
        startLicensingPhase();
        return true;
      }

      case 'linkedin_url': {
        if (input && !isValidUrl(input)) {
          appendMessage({ text: copy.invalidUrl });
          return true;
        }
        if (input) {
          data.linkedinUrl = input;
          // For now, just proceed - LinkedIn import would be a future feature
          appendMessage({
            text: lang === 'en'
              ? 'Great! I\'ve saved your LinkedIn profile. In the future, we\'ll be able to import your information automatically.'
              : '¡Excelente! He guardado su perfil de LinkedIn. En el futuro, podremos importar su información automáticamente.',
          });
        }
        startLicensingPhase();
        return true;
      }

      // Licensing Phase
      case 'countries_licensed': {
        const countries = input.split(/[,\s]+/).map(c => c.trim()).filter(Boolean);
        if (countries.length === 0) {
          appendMessage({
            text: lang === 'en'
              ? 'Please list at least one country where you hold a medical license.'
              : 'Por favor liste al menos un país donde tenga licencia médica.',
          });
          return true;
        }

        // Match countries to our known list
        const matchedCountries: string[] = [];
        countries.forEach(c => {
          const match = LICENSED_COUNTRIES.find(
            lc => lc.name.toLowerCase().includes(c.toLowerCase()) ||
                  lc.code.toLowerCase() === c.toLowerCase()
          );
          if (match && !matchedCountries.includes(match.code)) {
            matchedCountries.push(match.code);
          }
        });

        if (matchedCountries.length === 0) {
          appendMessage({
            text: lang === 'en'
              ? 'I didn\'t recognize those countries. Please try again with countries like: Mexico, USA, Colombia, Brazil, Argentina, etc.'
              : 'No reconocí esos países. Por favor intente de nuevo con países como: México, EE.UU., Colombia, Brasil, Argentina, etc.',
          });
          return true;
        }

        tempRef.current.pendingCountries = matchedCountries;
        const firstCountry = matchedCountries[0];
        tempRef.current.currentCountry = firstCountry;

        const countryInfo = LICENSED_COUNTRIES.find(c => c.code === firstCountry);
        const prompt = countryInfo?.code === 'US'
          ? copy.askUSAState
          : (copy.askOtherLicense.replace('{country}', countryInfo?.name || firstCountry) +
            ` (${countryInfo?.licenseType || 'License Number'})`);

        if (countryInfo?.code === 'US') {
          const stateActions: OnboardingAction[] = US_STATES.slice(0, 4).map(s => ({
            label: s,
            value: s,
            type: 'secondary',
          }));
          askQuestion('usa_states', prompt, stateActions);
        } else {
          askQuestion('license_number', prompt);
        }
        break;
      }

      case 'usa_states': {
        const states = input.split(/[,]+/).map(s => s.trim()).filter(Boolean);
        tempRef.current.currentLicense = {
          country: 'United States',
          countryCode: 'US',
          type: 'State Medical License',
          state: states[0], // For simplicity, take first state
        };
        askQuestion('license_number', copy.askUSALicense);
        break;
      }

      case 'license_number': {
        if (!input || input.length < 3) {
          appendMessage({ text: copy.invalidLicense });
          return true;
        }

        const countryCode = tempRef.current.currentCountry;
        const countryInfo = LICENSED_COUNTRIES.find(c => c.code === countryCode);

        const license: PhysicianLicense = tempRef.current.currentLicense
          ? { ...tempRef.current.currentLicense, number: input } as PhysicianLicense
          : {
              country: countryInfo?.name || countryCode || '',
              countryCode: countryCode || '',
              type: countryInfo?.licenseType || 'License',
              number: input,
            };

        data.licenses = [...(data.licenses || []), license];
        tempRef.current.currentLicense = undefined;

        // Check if more countries to process
        const pending = tempRef.current.pendingCountries || [];
        const nextCountries = pending.slice(1);

        if (nextCountries.length > 0) {
          tempRef.current.pendingCountries = nextCountries;
          const nextCountry = nextCountries[0];
          tempRef.current.currentCountry = nextCountry;

          const nextCountryInfo = LICENSED_COUNTRIES.find(c => c.code === nextCountry);
          if (nextCountry === 'US') {
            askQuestion('usa_states', copy.askUSAState);
          } else {
            askQuestion('license_number',
              copy.askOtherLicense.replace('{country}', nextCountryInfo?.name || nextCountry)
            );
          }
        } else {
          // Transition to specialty phase
          appendMessage({ text: copy.licenseNote });
          setTimeout(() => {
            startSpecialtyPhase();
          }, 1500);
          return true;
        }
        break;
      }

      // Specialty Phase
      case 'primary_specialty': {
        if (!input) {
          appendMessage({
            text: lang === 'en'
              ? 'Please provide your primary medical specialty.'
              : 'Por favor proporcione su especialidad médica principal.',
          });
          return true;
        }
        data.primarySpecialty = input;
        askQuestion('sub_specialties', copy.askSubSpecialties, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
      }

      case 'sub_specialties': {
        if (input.toLowerCase() !== 'skip' && input) {
          data.subSpecialties = input.split(/[,]+/).map(s => s.trim()).filter(Boolean);
        }
        askQuestion('board_certifications', copy.askBoardCertifications, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
      }

      case 'board_certifications': {
        if (input.toLowerCase() !== 'skip' && input) {
          // Simple parsing - in production would have more structured input
          const certs: BoardCertification[] = input.split(/[,;]+/).map(c => ({
            board: c.trim(),
            certification: c.trim(),
          }));
          data.boardCertifications = certs;
        }
        appendMessage({ text: copy.specialtyNote });
        setTimeout(() => startEducationPhase(), 600);
        return true;
      }

      // Education Phase
      case 'medical_school': {
        if (!input) {
          appendMessage({
            text: lang === 'en'
              ? 'Please provide your medical school.'
              : 'Por favor proporcione su escuela de medicina.',
          });
          return true;
        }
        data.medicalSchool = input;
        askQuestion('medical_school_country', copy.askMedicalSchoolCountry);
        break;
      }

      case 'medical_school_country': {
        data.medicalSchoolCountry = input;
        askQuestion('graduation_year', copy.askGraduationYear);
        break;
      }

      case 'graduation_year': {
        if (!isValidYear(input)) {
          appendMessage({ text: copy.invalidYear });
          return true;
        }
        data.graduationYear = parseInt(input, 10);
        askQuestion('honors', copy.askHonors, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
      }

      case 'honors': {
        if (input.toLowerCase() !== 'skip' && input) {
          data.honors = input.split(/[,;]+/).map(h => h.trim()).filter(Boolean);
        }
        askQuestion('residency_institution', copy.askResidency);
        break;
      }

      case 'residency_institution': {
        tempRef.current.currentResidency = { institution: input };
        askQuestion('residency_years', copy.askResidencyYears);
        break;
      }

      case 'residency_years': {
        const yearMatch = input.match(/(\d{4})\s*[-–]\s*(\d{4})/);
        if (yearMatch) {
          const residency: Residency = {
            institution: tempRef.current.currentResidency?.institution || '',
            specialty: data.primarySpecialty || '',
            startYear: parseInt(yearMatch[1], 10),
            endYear: parseInt(yearMatch[2], 10),
          };
          data.residency = [residency];
        }
        tempRef.current.currentResidency = undefined;
        askQuestion('fellowships', copy.askFellowships, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
      }

      case 'fellowships': {
        if (input.toLowerCase() !== 'skip' && input) {
          // Simple parsing
          data.fellowships = [{
            institution: input,
            specialty: '',
            startYear: 0,
            endYear: 0,
          }];
        }
        startIntellectualPhase();
        return true;
      }

      // Intellectual Phase
      case 'google_scholar': {
        // Handled by action click
        break;
      }

      case 'researchgate_url': {
        if (!input || !input.includes('researchgate.net')) {
          appendMessage({
            text: lang === 'en'
              ? 'Please enter a valid ResearchGate profile URL (e.g., https://www.researchgate.net/profile/Your-Name)'
              : 'Por favor ingresa una URL válida de ResearchGate (ej., https://www.researchgate.net/profile/Tu-Nombre)',
          });
          return true;
        }
        data.researchgateUrl = input;
        updateState('processing');

        // Fetch publications
        try {
          const response = await fetch('/api/publications/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'researchgate', query: input }),
          });
          const result = await response.json();

          if (result.success && result.publications.length > 0) {
            appendMessage({
              text: lang === 'en'
                ? `Found ${result.publications.length} publications! Select which ones to include in your profile:`
                : `¡Encontramos ${result.publications.length} publicaciones! Selecciona cuáles incluir en tu perfil:`,
              showPublicationSelector: {
                publications: result.publications,
                source: 'researchgate',
                profileName: result.profileName,
              },
            } as OnboardingBotMessage);
            setQuestion('publications_select');
            updateState('awaiting_user');
          } else {
            appendMessage({
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
          appendMessage({ text: lang === 'en' ? 'Error fetching publications. Please try again.' : 'Error al obtener publicaciones. Por favor intenta de nuevo.' });
          updateState('awaiting_user');
        }
        break;
      }

      case 'academia_url': {
        if (!input || !input.includes('academia.edu')) {
          appendMessage({
            text: lang === 'en'
              ? 'Please enter a valid Academia.edu profile URL'
              : 'Por favor ingresa una URL válida de Academia.edu',
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
            appendMessage({
              text: lang === 'en'
                ? `Found ${result.publications.length} publications! Select which ones to include:`
                : `¡Encontramos ${result.publications.length} publicaciones! Selecciona cuáles incluir:`,
              showPublicationSelector: {
                publications: result.publications,
                source: 'academia',
                profileName: result.profileName,
              },
            } as OnboardingBotMessage);
            setQuestion('publications_select');
            updateState('awaiting_user');
          } else {
            appendMessage({
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
          appendMessage({ text: lang === 'en' ? 'Error fetching publications.' : 'Error al obtener publicaciones.' });
          updateState('awaiting_user');
        }
        break;
      }

      case 'pubmed_search': {
        if (!input || input.length < 3) {
          appendMessage({
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
            appendMessage({
              text: lang === 'en'
                ? `Found ${result.publications.length} publications on PubMed! Select which ones to include:`
                : `¡Encontramos ${result.publications.length} publicaciones en PubMed! Selecciona cuáles incluir:`,
              showPublicationSelector: {
                publications: result.publications,
                source: 'pubmed',
                profileName: result.profileName,
              },
            } as OnboardingBotMessage);
            setQuestion('publications_select');
            updateState('awaiting_user');
          } else {
            appendMessage({
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
          appendMessage({ text: lang === 'en' ? 'Error searching PubMed.' : 'Error al buscar en PubMed.' });
          updateState('awaiting_user');
        }
        break;
      }

      case 'publications_manual':
      case 'publications_select': {
        // Handled by component callbacks
        break;
      }

      case 'publications': {
        if (input.toLowerCase() !== 'skip' && input) {
          data.publications = input.split(/\n+/).map(p => ({
            title: p.trim(),
          }));
        }
        askQuestion('presentations', copy.askPresentations, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
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
        break;
      }

      case 'books': {
        if (input.toLowerCase() !== 'skip' && input) {
          data.books = input.split(/\n+/).map(b => ({
            title: b.trim(),
            role: 'author' as const,
          }));
        }
        appendMessage({ text: copy.intellectualNote });
        setTimeout(() => startPresencePhase(), 600);
        return true;
      }

      // Presence Phase
      case 'current_institutions': {
        if (input) {
          data.currentInstitutions = input.split(/[,;]+/).map(i => i.trim()).filter(Boolean);
        }
        askQuestion('website', copy.askWebsite, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
      }

      case 'website': {
        if (input.toLowerCase() !== 'skip' && input) {
          if (!isValidUrl(input)) {
            appendMessage({ text: copy.invalidUrl });
            return true;
          }
          data.websiteUrl = input;
        }
        askQuestion('social_profiles', copy.askSocialProfiles, [
          { label: copy.skipPrompt, value: 'skip', type: 'skip' },
        ]);
        break;
      }

      case 'social_profiles': {
        if (input.toLowerCase() !== 'skip' && input) {
          // Parse URLs
          const urls = input.split(/[\s,]+/).filter(u => isValidUrl(u));
          urls.forEach(url => {
            if (url.includes('twitter.com') || url.includes('x.com')) {
              data.twitterUrl = url;
            } else if (url.includes('researchgate.net')) {
              data.researchgateUrl = url;
            } else if (url.includes('academia.edu')) {
              data.academiaEduUrl = url;
            }
          });
        }
        const dayActions: OnboardingAction[] = DAYS_OF_WEEK.map(d => ({
          label: d[lang],
          value: d.value,
          type: 'secondary',
        }));
        askQuestion('available_days', copy.askAvailableDays, dayActions);
        break;
      }

      case 'available_days': {
        const days = input.toLowerCase().split(/[,\s]+/).map(d => d.trim()).filter(Boolean);
        const matchedDays = days.map(d => {
          const match = DAYS_OF_WEEK.find(
            dw => dw.value.startsWith(d) || dw.en.toLowerCase().startsWith(d) || dw.es.toLowerCase().startsWith(d)
          );
          return match?.value;
        }).filter(Boolean) as string[];

        data.availableDays = matchedDays.length > 0 ? matchedDays : ['monday', 'wednesday', 'friday'];
        askQuestion('available_hours', copy.askAvailableHours);
        break;
      }

      case 'available_hours': {
        const timeMatch = input.match(/(\d{1,2}(?::\d{2})?)\s*(?:am|pm)?\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(?:am|pm)?/i);
        if (timeMatch) {
          data.availableHoursStart = timeMatch[1];
          data.availableHoursEnd = timeMatch[2];
        } else {
          data.availableHoursStart = '09:00';
          data.availableHoursEnd = '17:00';
        }

        const tzActions: OnboardingAction[] = AMERICAS_TIMEZONES.slice(0, 4).map(tz => ({
          label: tz.label,
          value: tz.value,
          type: 'secondary',
        }));
        askQuestion('timezone', copy.askTimezone, tzActions);
        break;
      }

      case 'timezone': {
        const tz = AMERICAS_TIMEZONES.find(
          t => t.value.toLowerCase().includes(input.toLowerCase()) ||
               t.label.toLowerCase().includes(input.toLowerCase())
        );
        data.timezone = tz?.value || 'America/Mexico_City';

        const langActions: OnboardingAction[] = CONSULTATION_LANGUAGES.map(l => ({
          label: l[lang],
          value: l.code,
          type: 'secondary',
        }));
        askQuestion('languages', copy.askLanguages, langActions);
        break;
      }

      case 'languages': {
        const langs = input.toLowerCase().split(/[,\s]+/).map(l => l.trim()).filter(Boolean);
        const matchedLangs = langs.map(l => {
          const match = CONSULTATION_LANGUAGES.find(
            cl => cl.code === l || cl.en.toLowerCase().startsWith(l) || cl.es.toLowerCase().startsWith(l)
          );
          return match?.code;
        }).filter(Boolean) as string[];

        data.languages = matchedLangs.length > 0 ? matchedLangs : ['es', 'en'];
        startConfirmationPhase();
        return true;
      }

      // Confirmation Phase
      case 'confirm_profile': {
        // Handled by action click
        break;
      }

      case 'edit_choice': {
        // For simplicity, restart from beginning
        // In production, would allow editing specific sections
        appendMessage({
          text: lang === 'en'
            ? 'Let\'s start over. You can update any information.'
            : 'Comencemos de nuevo. Puede actualizar cualquier información.',
        });
        dataRef.current = { licenses: [], languages: ['es', 'en'] };
        setTimeout(() => {
          setPhase('identity');
          askQuestion('full_name', copy.askFullName);
        }, 500);
        break;
      }

      default:
        return false;
    }

    setQuestion(null);
    return true;
  }, [
    state, question, copy, lang, appendMessage, askQuestion, updateState,
    startLicensingPhase, startSpecialtyPhase, startEducationPhase,
    startIntellectualPhase, startPresencePhase, startConfirmationPhase,
  ]);

  // Handle action button clicks
  const handleActionClick = useCallback(async (value: string): Promise<boolean> => {
    const currentQuestion = question;
    const data = dataRef.current;

    switch (currentQuestion) {
      case 'has_linkedin':
        if (value === 'yes') {
          // Check if LinkedIn data was already imported via OAuth
          if (linkedInData && !linkedInApplied.current) {
            linkedInApplied.current = true;

            // Show confirmation message with imported data
            appendMessage({
              text: lang === 'en'
                ? `Great! We pulled your information from LinkedIn. Please confirm the data below:`
                : `¡Excelente! Obtuvimos tu información de LinkedIn. Por favor confirma los datos a continuación:`,
              linkedInPreview: linkedInData,
            } as OnboardingBotMessage);

            // Store LinkedIn URL if we have name
            if (linkedInData.fullName) {
              data.linkedinUrl = `https://linkedin.com/in/${sessionId || 'profile'}`;
              data.linkedinImported = true;
            }

            setQuestion('linkedin_confirm');
            updateState('awaiting_user');
          } else {
            // Show connect button - will redirect to OAuth
            appendMessage({
              text: lang === 'en'
                ? 'Click the button below to connect your LinkedIn account. We\'ll import your profile information automatically.'
                : 'Haz clic en el botón de abajo para conectar tu cuenta de LinkedIn. Importaremos tu información de perfil automáticamente.',
              showLinkedInConnect: true,
            } as OnboardingBotMessage);

            // Also offer manual entry as fallback
            askQuestion('linkedin_url',
              lang === 'en'
                ? 'Or paste your LinkedIn profile URL here:'
                : 'O pega la URL de tu perfil de LinkedIn aquí:'
            );
          }
        } else {
          // No LinkedIn - ask for basic info manually
          appendMessage({
            text: lang === 'en'
              ? 'No problem at all. Let\'s get to know you the old-fashioned way.'
              : 'No hay problema. Conozcámosle de la manera tradicional.',
          });
          setTimeout(() => {
            askQuestion('full_name', copy.askFullName);
          }, 800);
        }
        return true;

      case 'linkedin_confirm':
        if (value === 'linkedin_confirm' && linkedInData) {
          // Apply LinkedIn data to profile
          if (linkedInData.fullName) data.fullName = linkedInData.fullName;
          if (linkedInData.email) data.email = linkedInData.email;
          if (linkedInData.photoUrl) data.photoUrl = linkedInData.photoUrl;
          if (linkedInData.medicalSchool) data.medicalSchool = linkedInData.medicalSchool;
          if (linkedInData.graduationYear) data.graduationYear = linkedInData.graduationYear;
          if (linkedInData.currentInstitutions) data.currentInstitutions = linkedInData.currentInstitutions;
          data.linkedinImported = true;

          appendMessage({
            text: lang === 'en'
              ? `✓ LinkedIn data confirmed! We've pre-filled your name${linkedInData.email ? ' and email' : ''}. Let's continue with your credentials.`
              : `✓ ¡Datos de LinkedIn confirmados! Hemos pre-llenado tu nombre${linkedInData.email ? ' y correo' : ''}. Continuemos con tus credenciales.`,
          });

          startLicensingPhase();
          return true;
        } else if (value === 'linkedin_edit') {
          // User wants to edit - proceed with manual flow
          appendMessage({
            text: lang === 'en'
              ? 'No problem! You can update any information as we go through the form.'
              : '¡No hay problema! Puedes actualizar cualquier información mientras avanzamos en el formulario.',
          });
          startLicensingPhase();
          return true;
        }
        break;

      case 'countries_licensed':
        // Country quick-select
        const country = LICENSED_COUNTRIES.find(c => c.code === value);
        if (country) {
          return handleUserInput(country.name);
        }
        break;

      case 'usa_states':
        return handleUserInput(value);

      case 'primary_specialty':
        return handleUserInput(value);

      case 'sub_specialties':
      case 'board_certifications':
      case 'honors':
      case 'fellowships':
      case 'publications':
      case 'presentations':
      case 'books':
      case 'website':
      case 'social_profiles':
        if (value === 'skip') {
          return handleUserInput('skip');
        }
        break;

      case 'google_scholar':
        if (value === 'yes') {
          // Show publication source options
          appendMessage({
            text: lang === 'en'
              ? 'Great! How would you like to add your publications?'
              : '¡Excelente! ¿Cómo te gustaría agregar tus publicaciones?',
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
          askQuestion('presentations', copy.askPresentations, [
            { label: copy.skipPrompt, value: 'skip', type: 'skip' },
          ]);
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
              : 'Ingresa tu nombre como aparece en PubMed (ej., "García Juan" o ORCID ID):'
          );
        } else if (value === 'manual') {
          appendMessage({
            text: lang === 'en'
              ? 'Add your publications using the form below. Click Cancel when done.'
              : 'Agrega tus publicaciones usando el formulario. Haz clic en Cancelar cuando termines.',
            showManualPublicationForm: true,
          } as OnboardingBotMessage);
          setQuestion('publications_manual');
          updateState('awaiting_user');
        } else if (value === 'retry') {
          // Show source selection again
          appendMessage({
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
          // User finished with publications
          const pubCount = dataRef.current.publications?.length || 0;
          appendMessage({
            text: pubCount > 0
              ? (lang === 'en' ? `Great! ${pubCount} publication(s) added to your profile.` : `¡Excelente! ${pubCount} publicación(es) agregadas a tu perfil.`)
              : (lang === 'en' ? 'No publications added.' : 'No se agregaron publicaciones.'),
          });
          askQuestion('presentations', copy.askPresentations, [
            { label: copy.skipPrompt, value: 'skip', type: 'skip' },
          ]);
        }
        return true;

      case 'available_days':
        // Toggle day selection
        const currentDays = dataRef.current.availableDays || [];
        if (currentDays.includes(value)) {
          dataRef.current.availableDays = currentDays.filter(d => d !== value);
        } else {
          dataRef.current.availableDays = [...currentDays, value];
        }
        // Continue to next question after any selection
        return handleUserInput(dataRef.current.availableDays.join(', '));

      case 'timezone':
        return handleUserInput(value);

      case 'languages':
        return handleUserInput(value);

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
    question, lang, copy, askQuestion, handleUserInput,
    startLicensingPhase, completeOnboarding,
  ]);

  // Start the onboarding
  const start = useCallback(() => {
    if (state !== 'idle') return;
    dataRef.current = { licenses: [], languages: ['es', 'en'] };
    tempRef.current = {};
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

    appendMessage({
      text: lang === 'en'
        ? `Added ${publications.length} publications to your profile.`
        : `Se agregaron ${publications.length} publicaciones a tu perfil.`,
    });

    // Continue to presentations
    askQuestion('presentations', copy.askPresentations, [
      { label: copy.skipPrompt, value: 'skip', type: 'skip' },
    ]);
  }, [lang, appendMessage, copy, askQuestion]);

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

    appendMessage({
      text: lang === 'en'
        ? `Added: "${publication.title}". Add another or click Cancel when done.`
        : `Agregado: "${publication.title}". Agrega otro o haz clic en Cancelar cuando termines.`,
      showManualPublicationForm: true,
    } as OnboardingBotMessage);
  }, [lang, appendMessage]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    start,
    isActive: () => state !== 'idle' && state !== 'completed',
    isAwaitingInput: () => state === 'awaiting_user',
    handleUserInput,
    handleActionClick,
    handlePublicationSelection,
    handleManualPublication,
  }));

  return null;
});

PhysicianOnboardingAgent.displayName = 'PhysicianOnboardingAgent';

export default PhysicianOnboardingAgent;
