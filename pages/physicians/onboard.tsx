/**
 * Physician Onboarding Page
 *
 * Conversational onboarding flow for new physicians joining the Medikah Network.
 * Uses the same PortalLayout and chat UI as patients for consistent experience.
 */

import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { KeyboardEvent, useEffect, useRef, useState, useCallback } from 'react';
import PortalLayout from '../../components/PortalLayout';
import PhysicianOnboardingAgent, {
  PhysicianOnboardingAgentHandle,
  OnboardingBotMessage,
  OnboardingAgentState,
} from '../../components/PhysicianOnboardingAgent';
import OnboardingPhaseIndicator, { mapAgentPhaseToIndicator } from '../../components/physician/OnboardingPhaseIndicator';
import LinkedInConnectButton, { LinkedInProfilePreview } from '../../components/LinkedInConnectButton';
import PublicationSelector, { ManualPublicationForm } from '../../components/PublicationSelector';
import PhysicianConsentModal, { PhysicianConsentData } from '../../components/PhysicianConsentModal';
import BatchedLicensingForm from '../../components/physician/onboarding/BatchedLicensingForm';
import BatchedSpecialtyForm from '../../components/physician/onboarding/BatchedSpecialtyForm';
import BatchedEducationForm from '../../components/physician/onboarding/BatchedEducationForm';
import BatchedPresenceForm from '../../components/physician/onboarding/BatchedPresenceForm';
import BatchedNarrativeForm from '../../components/physician/onboarding/BatchedNarrativeForm';
import { Publication, PublicationSource } from '../../lib/publications';
import { savePhysicianConsent } from '../../lib/physicianClient';
import { getPhysicianOnboardingStatus } from '../../lib/portalAuth';
import { SupportedLang } from '../../lib/i18n';

type Message = {
  sender: 'user' | 'bot';
  text: string;
  isVision?: boolean;
  isSummary?: boolean;
  actions?: { label: string; value: string; type?: 'primary' | 'secondary' | 'skip' | 'toggle'; selected?: boolean }[];
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
    publications: Publication[];
    source: PublicationSource;
    profileName?: string;
  };
  showManualPublicationForm?: boolean;
  showBatchedForm?: 'licensing' | 'specialty' | 'education' | 'presence' | 'narrative';
};

// Generate a unique session ID for LinkedIn OAuth
function generateSessionId(): string {
  return `onboard_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Conversational timing delays (in ms)
const TYPING_DELAY_BASE = 800; // Base delay before showing message
const TYPING_DELAY_PER_CHAR = 15; // Additional delay per character
const TYPING_DELAY_MAX = 2500; // Maximum delay

function calculateTypingDelay(text: string | undefined): number {
  if (!text) return TYPING_DELAY_BASE;
  const delay = TYPING_DELAY_BASE + Math.min(text.length * TYPING_DELAY_PER_CHAR, TYPING_DELAY_MAX - TYPING_DELAY_BASE);
  return delay;
}

export default function PhysicianOnboardingPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const lang: SupportedLang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agentState, setAgentState] = useState<OnboardingAgentState>('idle');
  const [agentPhase, setAgentPhase] = useState<string>('briefing');
  const [completedPhysicianId, setCompletedPhysicianId] = useState<string | null>(null);

  // LinkedIn data from NextAuth session (social login)
  const sessionLinkedInData = session?.user?.linkedInProfile ?? null;

  // LinkedIn OAuth state
  const [sessionId] = useState(() => generateSessionId());
  const [linkedInData, setLinkedInData] = useState<Message['linkedInPreview'] | null>(null);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const returningFromLinkedIn = useRef(false);

  // Consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingPhysicianId, setPendingPhysicianId] = useState<string | null>(null);
  const [pendingPhysicianName, setPendingPhysicianName] = useState<string>('');

  // Toggle button selections for multi-select (days, languages)
  const [toggleSelections, setToggleSelections] = useState<Set<string>>(new Set());

  // Message queue for conversational timing
  const messageQueueRef = useRef<OnboardingBotMessage[]>([]);
  const isProcessingQueueRef = useRef(false);

  const agentRef = useRef<PhysicianOnboardingAgentHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasStarted = useRef(false);
  const linkedInChecked = useRef(false);

  // Auth guard - redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'loading') return;

    if (!session) {
      router.replace('/chat');
      return;
    }

    // Check if already onboarded - redirect to dashboard or show consent
    const email = session.user?.email;
    if (email) {
      getPhysicianOnboardingStatus(email).then((status) => {
        if (status.isOnboarded && status.hasConsent) {
          router.replace('/physicians/dashboard');
        } else if (status.isOnboarded && !status.hasConsent && status.physicianId) {
          // Already onboarded but missing consent — skip to consent modal
          setPendingPhysicianId(status.physicianId);
          setPendingPhysicianName(session.user?.name || '');
          setShowConsentModal(true);
        }
      });
    }
  }, [session, authStatus, router]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Process message queue with conversational timing
  const processMessageQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    try {
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift()!;

        // Show typing indicator
        setIsTyping(true);

        // Wait for typing delay
        const delay = calculateTypingDelay(message.text);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Hide typing indicator and show message
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: message.text || '',
            isVision: message.isVision,
            isSummary: message.isSummary,
            actions: message.actions,
            showLinkedInConnect: message.showLinkedInConnect,
            linkedInPreview: message.linkedInPreview,
            showPublicationSelector: message.showPublicationSelector,
            showManualPublicationForm: message.showManualPublicationForm,
            showBatchedForm: message.showBatchedForm,
          },
        ]);

        // Small pause between messages if there are more
        if (messageQueueRef.current.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
      setIsTyping(false);
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, []);

  // Trigger queue processing when messages are added
  const triggerQueueProcessing = useCallback(() => {
    // Use setTimeout to avoid race conditions
    setTimeout(() => {
      if (!isProcessingQueueRef.current && messageQueueRef.current.length > 0) {
        processMessageQueue();
      }
    }, 0);
  }, [processMessageQueue]);

  // Use LinkedIn data from NextAuth session if available
  useEffect(() => {
    if (sessionLinkedInData && !linkedInConnected && !linkedInData) {
      setLinkedInData({
        fullName: sessionLinkedInData.fullName ?? undefined,
        email: sessionLinkedInData.email ?? undefined,
        photoUrl: sessionLinkedInData.photoUrl ?? undefined,
      });
      setLinkedInConnected(true);
    }
  }, [sessionLinkedInData, linkedInConnected, linkedInData]);

  // Check for LinkedIn callback params (fallback for custom OAuth flow)
  useEffect(() => {
    if (linkedInChecked.current) return;
    linkedInChecked.current = true;

    // Skip if we already have LinkedIn data from session
    if (sessionLinkedInData) return;

    const urlParams = new URLSearchParams(window.location.search);
    const linkedinStatus = urlParams.get('linkedin');
    const sessionParam = urlParams.get('session');

    if (linkedinStatus === 'connected' && sessionParam) {
      returningFromLinkedIn.current = true;
      fetch(`/api/auth/linkedin/profile?session_id=${encodeURIComponent(sessionParam)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.mappedData) {
            setLinkedInData(data.mappedData);
            setLinkedInConnected(true);
          } else {
            returningFromLinkedIn.current = false;
          }
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(err => {
          console.error('Failed to fetch LinkedIn profile:', err);
          returningFromLinkedIn.current = false;
          window.history.replaceState({}, '', window.location.pathname);
        });
    } else if (linkedinStatus === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [sessionLinkedInData]);

  // Start the onboarding when page loads — waits for LinkedIn data if returning from OAuth
  useEffect(() => {
    if (hasStarted.current) return;
    if (authStatus !== 'authenticated') return;

    const checkAndStart = () => {
      if (!agentRef.current || hasStarted.current) return false;

      // If returning from LinkedIn OAuth, wait until linkedInData is available
      if (returningFromLinkedIn.current && !linkedInConnected) {
        return false;
      }

      hasStarted.current = true;
      setTimeout(() => {
        agentRef.current?.start();
      }, 500);
      return true;
    };

    if (checkAndStart()) return;

    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (checkAndStart() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!hasStarted.current && agentRef.current) {
          hasStarted.current = true;
          agentRef.current.start();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [authStatus, linkedInConnected]);

  // Append message from agent (with queuing for timing)
  const appendMessage = useCallback((message: OnboardingBotMessage) => {
    messageQueueRef.current.push(message);
    triggerQueueProcessing();
  }, [triggerQueueProcessing]);

  // Handle state changes from agent
  const handleStateChange = useCallback((state: OnboardingAgentState) => {
    setAgentState(state);
  }, []);

  // Handle phase changes from agent (for progress indicator)
  const handlePhaseChange = useCallback((phase: string) => {
    setAgentPhase(phase);
  }, []);

  // Handle profile ready - show consent modal
  const handleProfileReady = useCallback((physicianId: string, physicianName: string) => {
    setPendingPhysicianId(physicianId);
    setPendingPhysicianName(physicianName);
    setShowConsentModal(true);
  }, []);

  // Handle consent completion
  const handleConsentComplete = useCallback(async (consentData: PhysicianConsentData) => {
    const result = await savePhysicianConsent({
      physicianId: consentData.physicianId,
      language: consentData.language,
      sections: consentData.sections,
      recordingConsent: consentData.recordingConsent,
      signedAt: consentData.signedAt,
      formVersion: consentData.formVersion,
    });

    if (!result.success) {
      messageQueueRef.current.push({
        text: lang === 'en'
          ? 'There was an error saving your consent. Please try again.'
          : 'Hubo un error al guardar su consentimiento. Por favor intente de nuevo.',
      });
      triggerQueueProcessing();
      return;
    }

    setShowConsentModal(false);
    setCompletedPhysicianId(consentData.physicianId);
    setAgentState('completed');
    setAgentPhase('completed');

    // Auto-redirect to dashboard after a brief delay
    setTimeout(() => {
      router.push('/physicians/dashboard');
    }, 4000);
  }, [lang, router]);

  // Handle consent cancel
  const handleConsentCancel = useCallback(() => {
    setShowConsentModal(false);
    setPendingPhysicianId(null);
    setPendingPhysicianName('');
  }, []);

  // Send user message
  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    const isAwaiting = agentRef.current?.isAwaitingInput();

    if (!trimmed || !isAwaiting) {
      setInput('');
      return;
    }

    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setIsSending(true);

    try {
      const agent = agentRef.current;
      if (agent) {
        await agent.handleUserInput(trimmed);
      }
    } finally {
      setIsSending(false);
      requestAnimationFrame(adjustTextareaHeight);
    }
  };

  // Handle action button clicks
  const handleActionClick = async (value: string) => {
    if (!agentRef.current?.isAwaitingInput()) return;

    setIsSending(true);
    try {
      await agentRef.current.handleActionClick(value);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && !isTyping) {
        sendMessage(input);
      }
    }
  };

  const isComplete = agentState === 'completed';
  const isAwaitingInput = agentState === 'awaiting_user' && !isSending && !isTyping;

  // Show loading while checking auth
  if (authStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linen-light">
        <div className="flex items-center gap-2 text-body-slate">
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce" />
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  // Sidebar content for onboarding progress
  const sidebarContent = (
    <OnboardingPhaseIndicator
      currentPhase={mapAgentPhaseToIndicator(agentPhase)}
      lang={lang}
      variant="sidebar"
    />
  );

  return (
    <>
      <Head>
        <title>
          {lang === 'en'
            ? 'Join the Network — Medikah'
            : 'Únete a la Red — Medikah'}
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {showConsentModal && pendingPhysicianId && (
        <PhysicianConsentModal
          physicianId={pendingPhysicianId}
          physicianName={pendingPhysicianName}
          lang={lang}
          onComplete={handleConsentComplete}
          onCancel={handleConsentCancel}
        />
      )}

      <PortalLayout
        portal="physician"
        onSignOut={() => signOut({ callbackUrl: '/chat' })}
        sidebarContent={sidebarContent}
        showChatInput={!isComplete}
        chatInputProps={!isComplete ? {
          value: input,
          onChange: setInput,
          onSubmit: sendMessage,
          onKeyDown: handleKeyDown,
          textareaRef,
          isSending: isSending || isTyping,
          placeholder: lang === 'en' ? 'Type your response…' : 'Escriba su respuesta…',
          accentColor: 'blue',
        } : undefined}
        headerTitle={lang === 'en' ? 'Join Network' : 'Únete'}
      >
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center px-6">
              <h2 className="font-heading uppercase tracking-[0.02em] text-2xl text-inst-blue mb-3">
                {lang === 'en' ? 'Welcome to Medikah' : 'Bienvenido a Medikah'}
              </h2>
              <p className="font-body text-body-slate text-sm max-w-md">
                {lang === 'en'
                  ? 'Starting your onboarding conversation...'
                  : 'Iniciando su conversación de registro...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-[200px] h-full">
            <div className="max-w-[900px] mx-auto w-full space-y-8">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex animate-messageAppear ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[700px] whitespace-pre-line transition-all duration-200 ${
                      message.sender === 'user'
                        ? 'bg-clinical-surface border-l-[3px] border-inst-blue px-6 py-5 rounded-[12px_12px_4px_12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_4px_12px_rgba(44,122,140,0.04)] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(27,42,65,0.08),0_8px_16px_rgba(44,122,140,0.06)] mr-5 sm:mr-10'
                        : message.isVision
                        ? 'bg-gradient-to-br from-inst-blue to-[#243447] text-white px-7 py-6 rounded-[16px] shadow-lg ml-5 sm:ml-10'
                        : message.isSummary
                        ? 'bg-white border-2 border-inst-blue/30 px-7 py-6 rounded-[12px] shadow-sm ml-5 sm:ml-10'
                        : 'bg-white border-l-4 border-inst-blue px-7 py-6 rounded-[12px_12px_12px_4px] shadow-[0_2px_4px_rgba(27,42,65,0.08),0_8px_20px_rgba(27,42,65,0.06)] hover:shadow-[0_3px_6px_rgba(27,42,65,0.08),0_12px_24px_rgba(27,42,65,0.06)] ml-5 sm:ml-10'
                    }`}
                  >
                    <p className={`font-body text-base leading-[1.7] ${
                      message.sender === 'user'
                        ? 'text-deep-charcoal'
                        : message.isVision
                        ? 'text-white/95'
                        : 'text-body-slate leading-[1.8]'
                    }`}>
                      {message.text}
                    </p>

                    {/* Action buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.actions.map((action, actionIdx) => {
                          const isToggle = action.type === 'toggle';
                          const isSelected = isToggle && (toggleSelections.has(action.value) || action.selected);

                          return (
                            <button
                              key={`${action.value}-${actionIdx}`}
                              onClick={() => {
                                if (isToggle) {
                                  // Toggle selection
                                  setToggleSelections(prev => {
                                    const next = new Set(prev);
                                    if (next.has(action.value)) {
                                      next.delete(action.value);
                                    } else {
                                      next.add(action.value);
                                    }
                                    // Update data in agent via a ref call
                                    const agent = agentRef.current;
                                    if (agent) {
                                      const currentQuestion = messages[messages.length - 1]?.actions?.[0]?.type === 'toggle'
                                        ? 'toggle_question' : '';
                                      // Store selected values for days or languages
                                      const selectedValues = Array.from(next);
                                      // Pass to agent data store
                                      (agent as unknown as { updateToggleData?: (key: string, values: string[]) => void })
                                        .updateToggleData?.('toggleSelections', selectedValues);
                                    }
                                    return next;
                                  });
                                } else {
                                  // For primary/done button, pass selections to agent then reset
                                  if (action.value === '__done__') {
                                    const selectedValues = Array.from(toggleSelections);
                                    // Update agent data before triggering done
                                    const agent = agentRef.current;
                                    if (agent) {
                                      (agent as unknown as { updateToggleData?: (values: string[]) => void })
                                        .updateToggleData?.(selectedValues);
                                    }
                                    setToggleSelections(new Set());
                                  }
                                  handleActionClick(action.value);
                                }
                              }}
                              disabled={!isAwaitingInput}
                              className={`font-body text-sm font-medium px-5 py-2.5 rounded-[10px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                action.type === 'primary'
                                  ? 'bg-teal-500 text-white hover:bg-teal-600 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(44,122,140,0.3)]'
                                  : action.type === 'skip'
                                  ? 'text-archival-grey hover:text-body-slate border border-border-line hover:border-body-slate'
                                  : isToggle
                                  ? isSelected
                                    ? 'bg-teal-500 text-white border border-teal-500 hover:bg-teal-600'
                                    : 'bg-white text-teal-500 hover:bg-teal-500/10 border border-teal-500/30'
                                  : 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border border-teal-500/30'
                              }`}
                            >
                              {isToggle && isSelected && <span className="mr-1">✓</span>}
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* LinkedIn Connect Button */}
                    {message.showLinkedInConnect && !linkedInConnected && (
                      <div className="mt-4">
                        <LinkedInConnectButton
                          sessionId={sessionId}
                          lang={lang}
                          disabled={!isAwaitingInput}
                          onError={(error) => {
                            messageQueueRef.current.push({ text: error });
                            processMessageQueue();
                          }}
                        />
                      </div>
                    )}

                    {/* LinkedIn Profile Preview */}
                    {message.linkedInPreview && (
                      <div className="mt-4">
                        <LinkedInProfilePreview
                          profile={message.linkedInPreview}
                          lang={lang}
                          onConfirm={() => handleActionClick('linkedin_confirm')}
                          onEdit={() => handleActionClick('linkedin_edit')}
                        />
                      </div>
                    )}

                    {/* Publication Selector */}
                    {message.showPublicationSelector && (
                      <div className="mt-4">
                        <PublicationSelector
                          publications={message.showPublicationSelector.publications}
                          source={message.showPublicationSelector.source}
                          profileName={message.showPublicationSelector.profileName}
                          lang={lang}
                          onConfirm={(selected) => {
                            agentRef.current?.handlePublicationSelection?.(selected);
                          }}
                          onCancel={() => handleActionClick('publications_cancel')}
                        />
                      </div>
                    )}

                    {/* Manual Publication Form */}
                    {message.showManualPublicationForm && (
                      <div className="mt-4">
                        <ManualPublicationForm
                          lang={lang}
                          onSubmit={(pub) => {
                            agentRef.current?.handleManualPublication?.({
                              ...pub,
                              source: 'manual',
                              includedInProfile: true,
                            });
                          }}
                          onCancel={() => handleActionClick('publications_done')}
                        />
                      </div>
                    )}

                    {/* Batched Form Components */}
                    {message.showBatchedForm === 'licensing' && (
                      <div className="mt-4">
                        <BatchedLicensingForm
                          lang={lang}
                          onSubmit={(data) => agentRef.current?.handleLicensingSubmit?.(data)}
                          onCancel={() => agentRef.current?.handleFormCancel?.()}
                        />
                      </div>
                    )}
                    {message.showBatchedForm === 'specialty' && (
                      <div className="mt-4">
                        <BatchedSpecialtyForm
                          lang={lang}
                          onSubmit={(data) => agentRef.current?.handleSpecialtySubmit?.(data)}
                          onCancel={() => agentRef.current?.handleFormCancel?.()}
                        />
                      </div>
                    )}
                    {message.showBatchedForm === 'education' && (
                      <div className="mt-4">
                        <BatchedEducationForm
                          lang={lang}
                          onSubmit={(data) => agentRef.current?.handleEducationSubmit?.(data)}
                          onCancel={() => agentRef.current?.handleFormCancel?.()}
                        />
                      </div>
                    )}
                    {message.showBatchedForm === 'presence' && (
                      <div className="mt-4">
                        <BatchedPresenceForm
                          lang={lang}
                          onSubmit={(data) => agentRef.current?.handlePresenceSubmit?.(data)}
                          onCancel={() => agentRef.current?.handleFormCancel?.()}
                        />
                      </div>
                    )}
                    {message.showBatchedForm === 'narrative' && (
                      <div className="mt-4">
                        <BatchedNarrativeForm
                          lang={lang}
                          onSubmit={(data) => agentRef.current?.handleNarrativeSubmit?.(data)}
                          onCancel={() => agentRef.current?.handleFormCancel?.()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {(isSending || isTyping) && (
                <div className="flex justify-start animate-messageAppear">
                  <div className="bg-white border-l-4 border-inst-blue px-7 py-5 rounded-[12px_12px_12px_4px] shadow-[0_2px_4px_rgba(27,42,65,0.08),0_8px_20px_rgba(27,42,65,0.06)] ml-5 sm:ml-10">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-inst-blue/30 rounded-full animate-typingBounce" />
                      <span className="w-1.5 h-1.5 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Completion overlay */}
        {isComplete && completedPhysicianId && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-heading uppercase tracking-[0.02em] text-2xl text-inst-blue mb-2">
                {lang === 'en' ? 'Registration Complete' : 'Registro Completo'}
              </h2>
              <p className="font-body text-body-slate mb-1">
                {lang === 'en' ? 'Reference ID: ' : 'ID de Referencia: '}
                <code className="font-mono text-xs bg-linen-light px-2 py-1 rounded">
                  {completedPhysicianId.slice(0, 8)}
                </code>
              </p>
              <p className="font-body text-sm text-archival-grey mb-6">
                {lang === 'en'
                  ? 'Our team will review your credentials and be in touch soon.'
                  : 'Nuestro equipo revisará sus credenciales y se pondrá en contacto pronto.'}
              </p>
              <button
                onClick={() => router.push('/physicians/dashboard')}
                className="font-body px-6 py-3 bg-inst-blue text-white font-semibold rounded-lg hover:bg-clinical-teal transition-colors"
              >
                {lang === 'en' ? 'Go to Dashboard' : 'Ir al Panel'}
              </button>
            </div>
          </div>
        )}
      </PortalLayout>

      {/* Agent component (renders nothing, just logic) */}
      <PhysicianOnboardingAgent
        ref={agentRef}
        lang={lang}
        appendMessage={appendMessage}
        onStateChange={handleStateChange}
        onPhaseChange={handlePhaseChange}
        onProfileReady={handleProfileReady}
        linkedInData={linkedInConnected && linkedInData ? linkedInData : undefined}
        sessionId={sessionId}
        sessionLinkedInData={sessionLinkedInData ? {
          fullName: sessionLinkedInData.fullName,
          email: sessionLinkedInData.email,
          photoUrl: sessionLinkedInData.photoUrl,
        } : undefined}
      />
    </>
  );
}
