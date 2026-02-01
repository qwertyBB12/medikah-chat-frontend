import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Splash from '../components/Splash';
import Sidebar from '../components/Sidebar';
import WelcomeRotator from '../components/WelcomeRotator';
import ChatInput from '../components/ChatInput';
import Footer from '../components/Footer';
import { SchedulerAction } from '../components/ChatSchedulerAgent';
import { LOGO_SRC } from '../lib/assets';

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

  const base = process.env.NEXT_PUBLIC_API_URL!;
  const lang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

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

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
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
      <div className="bg-navy-800/80 rounded-sm p-6 space-y-5 text-cream-300">
        <h3 className="font-heading text-base font-normal uppercase tracking-wider">
          {portalSelection === 'patient' ? 'Patient sign in' : 'Doctor sign in'}
        </h3>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs uppercase tracking-wider text-cream-300/50">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-cream-500/20 bg-navy-900/50 px-4 py-3 text-cream-300 placeholder-cream-300/30 focus:outline-none focus:border-teal rounded-none font-body"
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs uppercase tracking-wider text-cream-300/50">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-cream-500/20 bg-navy-900/50 px-4 py-3 text-cream-300 placeholder-cream-300/30 focus:outline-none focus:border-teal rounded-none font-body"
              placeholder="changeme"
              required
            />
          </div>
          {loginError && (
            <p className="text-sm text-coral bg-coral/10 border border-coral/20 px-3 py-2 text-center rounded-sm">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 font-heading font-normal uppercase tracking-wider text-sm bg-teal text-white hover:bg-teal-dark transition rounded-sm disabled:opacity-50"
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

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-cream-400 text-navy-900">
      <Sidebar onSignOut={() => signOut()} onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col bg-cream-400">
        {/* Mobile header */}
        <header className="md:hidden px-4 py-4 bg-navy-900 text-cream-300">
          <div className="flex items-center justify-between">
            <Image src={LOGO_SRC} alt="Medikah" width={96} height={96} priority className="w-10 h-auto" />
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="px-3 py-2 text-xs font-heading uppercase tracking-wider text-cream-300/70 hover:text-cream-300 transition"
              >
                New chat
              </button>
              <button
                onClick={() => signOut()}
                className="px-3 py-2 text-xs font-heading uppercase tracking-wider text-cream-300/50 border border-cream-500/15 hover:text-cream-300/80 transition rounded-sm"
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
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`px-5 py-4 max-w-xl whitespace-pre-line ${
                        message.sender === 'user'
                          ? 'bg-navy-900/10 rounded-lg'
                          : 'bg-transparent'
                      }`}
                    >
                      <p className={
                        message.sender === 'user'
                          ? 'text-navy-900 font-body'
                          : 'text-navy-900/80 font-body'
                      }>
                        {message.text}
                      </p>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.actions.map((action, actionIdx) => (
                            <a
                              key={`${action.label}-${actionIdx}`}
                              href={action.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-sm bg-teal px-4 py-2 text-xs font-heading uppercase tracking-wider text-white transition hover:bg-teal-dark"
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
