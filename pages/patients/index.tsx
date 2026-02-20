/**
 * Patient Portal Page
 *
 * The main chat experience for patients.
 * Redirects to /chat if not authenticated or if user is not a patient.
 */

import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import WelcomeRotator from '../../components/WelcomeRotator';
import ConsentModal from '../../components/ConsentModal';
import ChatSchedulerAgent, {
  ChatSchedulerAgentHandle,
  SchedulerAction,
  SchedulerBotMessage,
} from '../../components/ChatSchedulerAgent';
import { hasValidConsent } from '../../lib/consent';
import { SupportedLang } from '../../lib/i18n';

interface ChatResponse {
  ok?: boolean;
  reply?: unknown;
  session_id?: string;
  stage?: string;
  appointment_confirmed?: boolean;
  emergency_noted?: boolean;
  actions?: SchedulerAction[];
}

type Message = {
  sender: 'user' | 'bot';
  text: string;
  actions?: SchedulerAction[];
};

export default function PatientPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [consentCompleted, setConsentCompleted] = useState<boolean | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const base = process.env.NEXT_PUBLIC_API_URL!;
  const lang: SupportedLang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const schedulerRef = useRef<ChatSchedulerAgentHandle>(null);

  const appendSchedulerMessage = useCallback((msg: SchedulerBotMessage) => {
    setMessages((prev) => [
      ...prev,
      { sender: 'bot', text: msg.text, actions: msg.actions },
    ]);
  }, []);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if not authenticated or not a patient
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/chat');
      return;
    }
    // Allow patients only; physicians, insurers, employers should go to their portals
    const role = session.user?.role;
    if (role && role !== 'patient') {
      router.replace(`/${role}s`);
    }
  }, [session, status, router]);

  // Check consent on mount when authenticated
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id ?? session.user.email ?? '';
    if (!userId) return;
    hasValidConsent(userId).then((valid) => setConsentCompleted(valid));
  }, [session]);

  // Show consent modal immediately when consent check resolves to false
  useEffect(() => {
    if (consentCompleted === false) {
      setShowConsentModal(true);
    }
  }, [consentCompleted]);

  const consentCompletedRef = useRef(consentCompleted);
  consentCompletedRef.current = consentCompleted;

  const handleConsentComplete = () => {
    setShowConsentModal(false);
    setConsentCompleted(true);
    consentCompletedRef.current = true;
  };

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      return;
    }

    // Defense-in-depth: block messages if consent not yet completed
    if (!consentCompletedRef.current) {
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      return;
    }

    // If the scheduler agent is active, route input to it instead of the backend
    if (schedulerRef.current?.isActive()) {
      const userMsg: Message = { sender: 'user', text: trimmed };
      setMessages((msgs) => [...msgs, userMsg]);
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      await schedulerRef.current.handleUserInput(trimmed);
      return;
    }

    const userMsg: Message = { sender: 'user', text: trimmed };
    setMessages((msgs) => [...msgs, userMsg]);
    setIsSending(true);

    try {
      const payload: Record<string, unknown> = { message: trimmed };
      if (sessionIdRef.current) payload.session_id = sessionIdRef.current;
      if (lang) payload.locale = lang;
      try { payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }
      payload.patient_name = session?.user?.name || '';
      payload.patient_email = session?.user?.email || '';

      const res = await fetch(`${base}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: ChatResponse = {};
      try {
        data = (await res.json()) as ChatResponse;
      } catch {
        data = {};
      }

      const reply =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply
          : 'We could not process your message right now. Please try again.';

      if (typeof data.session_id === 'string' && data.session_id.length > 0) {
        sessionIdRef.current = data.session_id;
      }

      const actionList: SchedulerAction[] | undefined = Array.isArray(data.actions)
        ? data.actions.filter(
            (action): action is SchedulerAction =>
              typeof action?.label === 'string' && typeof action?.url === 'string'
          )
        : undefined;

      setMessages((msgs): Message[] => [
        ...msgs,
        { sender: 'bot', text: reply, actions: actionList },
      ]);

      // Activate the scheduler when the backend signals scheduling stage
      if (data.stage === 'scheduling' || data.appointment_confirmed === false) {
        schedulerRef.current?.start();
      }
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { sender: 'bot', text: 'Connection error. Please check your network and try again.' },
      ]);
    } finally {
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending) sendMessage(input);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    sessionIdRef.current = null;
    // Scheduler resets itself after completion; starting a new chat
    // ensures it won't carry stale state
    requestAnimationFrame(() => adjustTextareaHeight());
  };

  // Show loading while checking auth or consent status
  if (status === 'loading' || !session || consentCompleted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="flex items-center gap-2 text-body-slate">
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce" />
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  const consentUserId = session.user?.id ?? session.user?.email ?? '';

  return (
    <>
      <Head>
        <title>Patient Portal — Medikah</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <ChatSchedulerAgent
        ref={schedulerRef}
        lang={lang}
        sessionName={session.user?.name || undefined}
        sessionEmail={session.user?.email || undefined}
        appendMessage={appendSchedulerMessage}
      />

      {showConsentModal && (
        <ConsentModal
          userId={consentUserId}
          lang={lang}
          onComplete={handleConsentComplete}
        />
      )}

      <PortalLayout
        portal="patient"
        onSignOut={() => signOut({ callbackUrl: '/chat' })}
        onNewChat={handleNewChat}
        showChatInput={true}
        chatInputProps={{
          value: input,
          onChange: setInput,
          onSubmit: sendMessage,
          onKeyDown: handleTextareaKeyDown,
          textareaRef,
          isSending,
        }}
        headerTitle="Patient Portal"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <WelcomeRotator />
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
                        ? 'bg-clinical-surface border-l-[3px] border-clinical-teal px-6 py-5 rounded-[12px_12px_4px_12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_4px_12px_rgba(44,122,140,0.04)] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(27,42,65,0.08),0_8px_16px_rgba(44,122,140,0.06)] mr-5 sm:mr-10'
                        : 'bg-white border-l-4 border-inst-blue px-7 py-6 rounded-[12px_12px_12px_4px] shadow-[0_2px_4px_rgba(27,42,65,0.08),0_8px_20px_rgba(27,42,65,0.06)] hover:shadow-[0_3px_6px_rgba(27,42,65,0.08),0_12px_24px_rgba(27,42,65,0.06)] ml-5 sm:ml-10'
                    }`}
                  >
                    <p className={`font-dm-sans text-base leading-[1.7] ${
                      message.sender === 'user'
                        ? 'text-deep-charcoal'
                        : 'text-body-slate leading-[1.8]'
                    }`}>
                      {message.text}
                    </p>
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.actions.map((action, actionIdx) => (
                          <a
                            key={`${action.label}-${actionIdx}`}
                            href={action.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-dm-sans inline-flex items-center gap-1 rounded-[10px] bg-clinical-teal px-5 py-2.5 text-xs font-semibold tracking-wide text-white transition-all duration-200 hover:bg-[#2A8DA0] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(44,122,140,0.3)]"
                          >
                            {action.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
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
      </PortalLayout>
    </>
  );
}
