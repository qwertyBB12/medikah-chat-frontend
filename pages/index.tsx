import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Splash from '../components/Splash';
import Sidebar from '../components/Sidebar';
import WelcomeRotator from '../components/WelcomeRotator';
import ChatInput from '../components/ChatInput';
import Footer from '../components/Footer';
import { ThemeKey, THEMES } from '../lib/theme';

interface ChatResponse {
  ok?: boolean;
  reply?: unknown;  // we'll type-narrow at runtime
}

type Message = {
  sender: 'user' | 'bot';
  text: string;
};

interface HealthResponse {
  ok?: boolean;
  service?: string;
  [key: string]: unknown;
}

export default function Home() {
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
  const [theme, setTheme] = useState<ThemeKey>('warm');
  const themeSettings = THEMES[theme];
  const toggleTheme = () => setTheme((prev) => (prev === 'warm' ? 'ocean' : 'warm'));
  const base = process.env.NEXT_PUBLIC_API_URL!;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    setIsSending(true);
    setMessages((msgs) => [...msgs, userMsg]);

    try {
      const res = await fetch(`${base}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed })
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
          : 'Lo siento — I couldn’t reply just now. Please try again.';

      setMessages((msgs): Message[] => [
        ...msgs,
        { sender: 'bot', text: reply },
      ]);
    } catch (err) {
      console.error('Chat request error:', err);
      setMessages((msgs) => [
        ...msgs,
        { sender: 'bot', text: 'Network error — please check your connection and try again.' }
      ]);
    }
    finally {
      setInput('');
      requestAnimationFrame(() => adjustTextareaHeight());
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending) {
        sendMessage(input);
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    requestAnimationFrame(() => adjustTextareaHeight());
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password
    });

    setIsSubmitting(false);

    if (result?.error) {
      setLoginError('No encontramos esos datos. Intenta de nuevo.');
      return;
    }

    await router.replace(router.asPath);
  };

  const handleDoctorLogin = () => {
    setPortalSelection('doctor');
    setShowLoginForm(true);
    setLoginError(null);
  };

  const handlePatientLogin = () => {
    setPortalSelection('patient');
    setShowLoginForm(true);
    setLoginError(null);
  };

  const handleHealthCheck = async () => {
    try {
      const res = await fetch(`${base}/health`);
      const payload = (await res.json().catch(() => ({}))) as HealthResponse;
      if (!res.ok) {
        alert(`Health check failed: ${JSON.stringify(payload)}`);
        return;
      }
      alert(JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('Health check error:', error);
      alert('Unable to reach the API health endpoint.');
    }
  };

  const handleInsurerAccess = () => {
    setShowLoginForm(false);
    setPortalSelection('insurer');
  };

  const handleAdminAccess = () => {
    setShowLoginForm(false);
    setPortalSelection(null);
  };

  if (!session) {
    const loginCardClass =
      theme === 'warm'
        ? 'bg-white/95 rounded-2xl p-6 space-y-5 shadow text-text'
        : 'bg-[#0c3a42]/85 rounded-2xl p-6 space-y-5 shadow text-white border border-[#1a7c8b]/40';
    const labelClass =
      theme === 'warm'
        ? 'text-xs uppercase tracking-wide text-muted'
        : 'text-xs uppercase tracking-wide text-white/70';
    const inputClass =
      theme === 'warm'
        ? 'border border-muted/60 bg-white px-4 py-3 text-text focus:outline-none focus:border-[#1a7c8b] focus:ring-0 rounded-none'
        : 'border border-[#1a7c8b]/60 bg-white px-4 py-3 text-[#0c3a42] focus:outline-none focus:border-[#f4d7d1] focus:ring-0 rounded-none';
    const helperTextClass =
      theme === 'warm'
        ? 'text-xs text-muted text-center'
        : 'text-xs text-white/70 text-center';

    const loginPanel = showLoginForm ? (
      <div className={loginCardClass}>
        <h3 className="text-lg font-heading font-extrabold lowercase">
          {portalSelection === 'patient' ? 'patient check-in' : 'doctor check-in'}
        </h3>
        <p className="text-sm leading-relaxed opacity-80">
          Comparte tus datos cuando estés listo; te llevamos de regreso con calma.
        </p>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="correo@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="tu contraseña"
              required
            />
          </div>
          {loginError && (
            <p className="text-sm text-red-600 bg-red-100 border border-red-200 px-3 py-2 text-center">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            className={`w-full px-4 py-3 font-heading font-semibold tracking-wide rounded-none disabled:opacity-60 lowercase transition ${themeSettings.primaryButton}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'signing in…' : 'sign in'}
          </button>
          <p className={helperTextClass}>
            ¿Solo explorando? Usa test@example.com y test123.
          </p>
        </form>
      </div>
    ) : null;

    return (
      <Splash
        onDoctorLogin={handleDoctorLogin}
        onPatientLogin={handlePatientLogin}
        onInsuranceEmployers={handleInsurerAccess}
        onAdminAccess={handleAdminAccess}
        loginPanel={loginPanel}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
    );
  }

  const warmBackgroundStyle = theme === 'warm' ? { backgroundColor: '#b38382' } : undefined;

  return (
    <div
      className={`min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row ${themeSettings.appBackground} ${themeSettings.baseTextColor}`}
      style={warmBackgroundStyle}
    >
      <Sidebar
        onSignOut={() => signOut()}
        onNewChat={handleNewChat}
        onToggleTheme={toggleTheme}
        theme={theme}
        themeSettings={themeSettings}
      />

      <div className={`flex-1 flex flex-col ${themeSettings.mainPanelBackground}`}>
        <header className={`md:hidden px-4 py-4 ${themeSettings.headerBackground}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Medikah logo"
                width={96}
                height={96}
                className="w-12 h-auto sm:w-14"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`px-3 py-2 text-xs font-heading lowercase transition rounded-none ${themeSettings.toggleButton}`}
              >
                {theme === 'warm' ? 'ocean mode' : 'warm mode'}
              </button>
              <button
                onClick={handleNewChat}
                className={`px-3 py-2 text-xs font-heading transition rounded-none ${themeSettings.newChatButton}`}
              >
                → start a new chat
              </button>
              <button
                onClick={() => signOut()}
                className={`px-3 py-2 text-xs font-heading rounded-none transition ${themeSettings.mobileOutlineButton}`}
              >
                sign out
              </button>
            </div>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${themeSettings.headerText}`}>
            Medikah AI ofrece orientación detallada preparada por clínicos en toda América. Úsala para entender tus opciones y acude a un profesional cuando necesites acompañamiento más profundo.
          </p>
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
                        message.sender === 'user' ? themeSettings.userBubble : themeSettings.botBubble
                      }`}
                    >
                      <p className={message.sender === 'user' ? themeSettings.userTextClass : themeSettings.botTextClass}>
                        {message.text}
                      </p>
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
          themeSettings={themeSettings}
        />
        {process.env.NODE_ENV !== 'production' ? (
          <div className="px-4 sm:px-10 pb-3">
            <button
              type="button"
              onClick={handleHealthCheck}
              className="px-3 py-2 text-xs font-heading rounded-none border border-muted/60 text-muted hover:bg-muted/10 transition"
            >
              Test API
            </button>
          </div>
        ) : null}

        <Footer themeSettings={themeSettings} />
      </div>
    </div>
  );
}
