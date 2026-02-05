import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState, useCallback } from 'react';
import PhysicianOnboardingAgent, {
  PhysicianOnboardingAgentHandle,
  OnboardingBotMessage,
  OnboardingAgentState,
} from '../../components/PhysicianOnboardingAgent';
import { LOGO_SRC } from '../../lib/assets';
import { SupportedLang } from '../../lib/i18n';

type Message = {
  sender: 'user' | 'bot';
  text: string;
  isVision?: boolean;
  isSummary?: boolean;
  actions?: { label: string; value: string; type?: 'primary' | 'secondary' | 'skip' }[];
};

export default function PhysicianOnboardingPage() {
  const router = useRouter();
  const lang: SupportedLang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agentState, setAgentState] = useState<OnboardingAgentState>('idle');
  const [completedPhysicianId, setCompletedPhysicianId] = useState<string | null>(null);

  const agentRef = useRef<PhysicianOnboardingAgentHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasStarted = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Start the onboarding when page loads
  useEffect(() => {
    if (!hasStarted.current && agentRef.current) {
      hasStarted.current = true;
      setTimeout(() => {
        agentRef.current?.start();
      }, 500);
    }
  }, []);

  // Append message from agent
  const appendMessage = useCallback((message: OnboardingBotMessage) => {
    setMessages(prev => [
      ...prev,
      {
        sender: 'bot',
        text: message.text,
        isVision: message.isVision,
        isSummary: message.isSummary,
        actions: message.actions,
      },
    ]);
  }, []);

  // Handle state changes from agent
  const handleStateChange = useCallback((state: OnboardingAgentState) => {
    setAgentState(state);
  }, []);

  // Handle completion
  const handleComplete = useCallback((physicianId: string) => {
    setCompletedPhysicianId(physicianId);
  }, []);

  // Send user message
  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || !agentRef.current?.isAwaitingInput()) {
      setInput('');
      return;
    }

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setIsSending(true);

    try {
      await agentRef.current.handleUserInput(trimmed);
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
      if (!isSending) sendMessage(input);
    }
  };

  // Handle form submit
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSending) sendMessage(input);
  };

  const isComplete = agentState === 'completed';
  const isAwaitingInput = agentState === 'awaiting_user' && !isSending;

  return (
    <>
      <Head>
        <title>
          {lang === 'en'
            ? 'Physician Onboarding — Medikah Network'
            : 'Registro de Médicos — Red Medikah'}
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAFB]">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border-line/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={LOGO_SRC}
                alt="Medikah"
                width={40}
                height={40}
                priority
                className="w-10 h-10"
              />
              <span className="font-dm-serif text-xl text-inst-blue">
                {lang === 'en' ? 'Physician Network' : 'Red de Médicos'}
              </span>
            </Link>

            {/* Language toggle */}
            <button
              onClick={() => {
                const newLocale = lang === 'en' ? 'es' : 'en';
                router.push(router.pathname, router.asPath, { locale: newLocale });
              }}
              className="font-dm-sans text-sm font-medium px-3 py-1.5 border border-border-line rounded-lg text-body-slate hover:text-inst-blue hover:border-clinical-teal transition"
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Messages */}
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.sender === 'user'
                        ? 'bg-clinical-surface border-l-[3px] border-clinical-teal px-5 py-4 rounded-[12px_12px_4px_12px]'
                        : message.isVision
                        ? 'bg-gradient-to-br from-inst-blue to-[#243447] text-white px-6 py-5 rounded-[16px] shadow-lg'
                        : message.isSummary
                        ? 'bg-white border-2 border-clinical-teal/30 px-6 py-5 rounded-[12px] shadow-sm'
                        : 'bg-white border-l-4 border-inst-blue px-6 py-5 rounded-[12px_12px_12px_4px] shadow-sm'
                    }`}
                  >
                    <div
                      className={`font-dm-sans text-base leading-[1.7] whitespace-pre-wrap ${
                        message.sender === 'user'
                          ? 'text-deep-charcoal'
                          : message.isVision
                          ? 'text-white/95'
                          : 'text-body-slate'
                      }`}
                    >
                      {/* Render markdown-like formatting */}
                      {message.text.split('\n').map((line, i) => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <p key={i} className="font-semibold text-inst-blue mb-2">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          );
                        }
                        if (line.startsWith('- ')) {
                          return (
                            <p key={i} className="ml-4">
                              • {line.substring(2)}
                            </p>
                          );
                        }
                        return <p key={i}>{line}</p>;
                      })}
                    </div>

                    {/* Action buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.actions.map((action, actionIdx) => (
                          <button
                            key={`${action.value}-${actionIdx}`}
                            onClick={() => handleActionClick(action.value)}
                            disabled={!isAwaitingInput}
                            className={`font-dm-sans text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                              action.type === 'primary'
                                ? 'bg-clinical-teal text-white hover:bg-clinical-teal-dark'
                                : action.type === 'skip'
                                ? 'text-archival-grey hover:text-body-slate border border-border-line hover:border-body-slate'
                                : 'bg-inst-blue/10 text-inst-blue hover:bg-inst-blue/20 border border-inst-blue/30'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white border-l-4 border-inst-blue px-6 py-4 rounded-[12px_12px_12px_4px] shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </main>

        {/* Input area */}
        {!isComplete && (
          <div className="sticky bottom-0 bg-gradient-to-t from-[#FAFAFB] via-[#FAFAFB]/95 to-transparent px-4 py-6">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isAwaitingInput}
                placeholder={
                  isAwaitingInput
                    ? lang === 'en'
                      ? 'Type your response...'
                      : 'Escriba su respuesta...'
                    : ''
                }
                className="font-dm-sans w-full resize-none bg-white border border-border-line text-deep-charcoal text-base leading-relaxed placeholder:text-archival-grey rounded-[12px] pl-5 pr-24 py-4 min-h-[56px] max-h-[200px] shadow-sm transition-all duration-200 focus:outline-none focus:border-clinical-teal focus:shadow-[0_0_0_3px_rgba(44,122,140,0.1)] disabled:bg-clinical-surface disabled:cursor-not-allowed"
                rows={1}
              />
              <button
                type="submit"
                disabled={!isAwaitingInput || !input.trim()}
                className="font-dm-sans absolute right-3 bottom-3 px-5 py-2.5 font-semibold text-sm bg-clinical-teal text-white rounded-lg shadow-sm transition-all duration-200 hover:bg-clinical-teal-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'en' ? 'Send' : 'Enviar'}
              </button>
            </form>

            <p className="font-dm-sans max-w-3xl mx-auto text-[12px] mt-2 text-center text-archival-grey">
              {lang === 'en'
                ? 'Press Enter to send. Shift+Enter for a new line.'
                : 'Presione Enter para enviar. Shift+Enter para nueva línea.'}
            </p>
          </div>
        )}

        {/* Completion state */}
        {isComplete && completedPhysicianId && (
          <div className="sticky bottom-0 bg-white border-t border-border-line px-4 py-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-dm-sans text-sm text-body-slate mb-4">
                {lang === 'en'
                  ? 'Your profile has been submitted. Reference ID: '
                  : 'Su perfil ha sido enviado. ID de referencia: '}
                <code className="font-mono text-xs bg-clinical-surface px-2 py-1 rounded">
                  {completedPhysicianId.slice(0, 8)}
                </code>
              </p>
              <Link
                href="/"
                className="font-dm-sans inline-block px-6 py-3 bg-inst-blue text-white font-semibold rounded-lg hover:bg-clinical-teal transition-colors"
              >
                {lang === 'en' ? 'Return to Homepage' : 'Volver al Inicio'}
              </Link>
            </div>
          </div>
        )}

        {/* Agent component (renders nothing, just logic) */}
        <PhysicianOnboardingAgent
          ref={agentRef}
          lang={lang}
          appendMessage={appendMessage}
          onStateChange={handleStateChange}
          onComplete={handleComplete}
        />
      </div>
    </>
  );
}
