import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Splash from '../components/Splash';
import Sidebar from '../components/Sidebar';
import WelcomeRotator from '../components/WelcomeRotator';
import ChatInput from '../components/ChatInput';
import Footer from '../components/Footer';
import ConsentModal from '../components/ConsentModal';
import { SchedulerAction } from '../components/ChatSchedulerAgent';
import { LOGO_SRC } from '../lib/assets';
import { hasValidConsent } from '../lib/consent';
import { SupportedLang } from '../lib/i18n';

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

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [portalSelection, setPortalSelection] = useState<'doctor' | 'patient' | 'insurer' | 'employer' | null>(null);
  const [consentCompleted, setConsentCompleted] = useState<boolean | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const pendingMessageRef = useRef<string | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL!;
  const lang: SupportedLang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);

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

  // Check consent on mount when authenticated
  useEffect(() => {
    if (!session?.user) return;
    const userId = (session.user as { id?: string }).id ?? session.user.email ?? '';
    if (!userId) return;
    hasValidConsent(userId).then((valid) => setConsentCompleted(valid));
  }, [session]);

  const consentCompletedRef = useRef(consentCompleted);
  consentCompletedRef.current = consentCompleted;

  const handleConsentComplete = () => {
    setShowConsentModal(false);
    setConsentCompleted(true);
    consentCompletedRef.current = true;
    // If there was a pending message, send it now
    const msg = pendingMessageRef.current;
    if (msg) {
      pendingMessageRef.current = null;
      // Delay to let state settle before sending
      setTimeout(() => sendMessage(msg), 0);
    }
  };

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      return;
    }

    // Block on consent if not yet completed
    if (!consentCompletedRef.current) {
      pendingMessageRef.current = trimmed;
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      setShowConsentModal(true);
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
    requestAnimationFrame(() => adjustTextareaHeight());
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await signIn('credentials', { redirect: false, email, password });
    setIsSubmitting(false);

    if (result?.error) {
      setLoginError('Credentials not recognized. Please try again.');
      return;
    }
    await router.replace(router.asPath);
  };

  if (!session) {
    const loginPanel = showLoginForm ? (
      <div className="bg-inst-blue/80 rounded-sm p-6 space-y-5 text-white">
        <h3 className="text-base font-bold tracking-wide">
          {portalSelection === 'patient' ? 'Patient sign in' : 'Doctor sign in'}
        </h3>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs uppercase tracking-wider text-white/50">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-white/20 bg-inst-blue/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-none"
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs uppercase tracking-wider text-white/50">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-white/20 bg-inst-blue/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-none"
              placeholder="changeme"
              required
            />
          </div>
          {loginError && (
            <p className="text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 font-bold tracking-wide text-sm bg-inst-blue text-white border border-white/20 hover:bg-clinical-teal hover:border-clinical-teal transition rounded-sm disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in\u2026' : 'Sign in'}
          </button>
        </form>
      </div>
    ) : null;

    return (
      <Splash
        onDoctorLogin={() => { setPortalSelection('doctor'); setShowLoginForm(true); setLoginError(null); }}
        onPatientLogin={() => { setPortalSelection('patient'); setShowLoginForm(true); setLoginError(null); }}
        onInsuranceEmployers={() => { setShowLoginForm(false); setPortalSelection('insurer'); }}
        onAdminAccess={() => { setShowLoginForm(false); setPortalSelection(null); }}
        loginPanel={loginPanel}
      />
    );
  }

  const consentUserId = (session.user as { id?: string })?.id ?? session.user?.email ?? '';

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-[#FAFAFB] text-deep-charcoal">
      {showConsentModal && (
        <ConsentModal
          userId={consentUserId}
          lang={lang}
          onComplete={handleConsentComplete}
        />
      )}
      <Sidebar onSignOut={() => signOut()} onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col bg-[#FAFAFB]">
        {/* Mobile header */}
        <header className="md:hidden px-4 py-4 bg-gradient-to-r from-inst-blue to-[#243447] text-white">
          <div className="flex items-center justify-between">
            <Image src={LOGO_SRC} alt="Medikah" width={96} height={96} priority className="w-10 h-auto" />
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewChat}
                className="px-3 py-2 text-xs font-semibold tracking-wide text-white/70 hover:text-white transition"
              >
                New chat
              </button>
              <button
                onClick={() => signOut()}
                className="px-3 py-2 text-xs font-semibold tracking-wide text-white/80 border border-white/20 hover:text-white hover:border-white/30 transition rounded-[8px]"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <WelcomeRotator />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-[200px]">
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
                      <p className={`text-base leading-[1.7] ${
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
                              className="inline-flex items-center gap-1 rounded-[10px] bg-clinical-teal px-5 py-2.5 text-xs font-semibold tracking-wide text-white transition-all duration-200 hover:bg-[#2A8DA0] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(44,122,140,0.3)]"
                            >
                              {action.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </main>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          onKeyDown={handleTextareaKeyDown}
          textareaRef={textareaRef}
          isSending={isSending}
        />

        <Footer />
      </div>
    </div>
  );
}
