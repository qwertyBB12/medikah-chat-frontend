import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const AI_MESSAGE: Record<Locale, string> = {
  en: "Hello! I'm your Medikah coordination assistant. I can help you describe your health concerns, find a physician, and schedule a consultation \u2014 in English or Spanish. How can I help you today?",
  es: "\u00a1Hola! Soy su asistente de coordinaci\u00f3n de Medikah. Puedo ayudarle a describir sus inquietudes de salud, encontrar un m\u00e9dico y programar una consulta \u2014 en ingl\u00e9s o espa\u00f1ol. \u00bfC\u00f3mo puedo ayudarle hoy?",
};

const PATIENT_MESSAGE: Record<Locale, string> = {
  en: "I've been having headaches for three days and some dizziness when I stand up.",
  es: "He tenido dolores de cabeza por tres d\u00edas y algo de mareo cuando me pongo de pie.",
};

const ASSESSMENT_TITLE: Record<Locale, string> = {
  en: 'Symptom Assessment',
  es: 'Evaluaci\u00f3n de S\u00edntomas',
};

const ASSESSMENT_ITEMS: Record<Locale, string[]> = {
  en: [
    'How would you rate the pain? (1\u201310)',
    'Any visual changes or nausea?',
    'Are you currently taking medications?',
  ],
  es: [
    '\u00bfC\u00f3mo calificar\u00eda el dolor? (1\u201310)',
    '\u00bfAlg\u00fan cambio visual o n\u00e1useas?',
    '\u00bfEst\u00e1 tomando medicamentos actualmente?',
  ],
};

const AI_RESPONSE_2: Record<Locale, string> = {
  en: "Thank you for sharing that. I'd like to understand your symptoms better so I can connect you with the right physician.",
  es: "Gracias por compartir eso. Me gustar\u00eda entender mejor sus s\u00edntomas para conectarle con el m\u00e9dico adecuado.",
};

const CHIPS: Record<Locale, string[]> = {
  en: ['Mild (1\u20133)', 'Moderate (4\u20136)', 'Severe (7\u201310)', 'S\u00ed', 'No', 'Cu\u00e9ntame m\u00e1s'],
  es: ['Leve (1\u20133)', 'Moderado (4\u20136)', 'Severo (7\u201310)', 'S\u00ed', 'No', 'Cu\u00e9ntame m\u00e1s'],
};

export default function ChatShowcase() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;
  const sectionRef = useRef<HTMLElement>(null);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showPatient, setShowPatient] = useState(false);
  const [showAI2, setShowAI2] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [chatLang, setChatLang] = useState<Locale>('en');
  const typingStarted = useRef(false);

  const startTyping = useCallback(() => {
    if (typingStarted.current) return;
    typingStarted.current = true;

    const message = AI_MESSAGE[chatLang];
    let i = 0;
    const speed = 22;

    function typeChar() {
      if (i < message.length) {
        setTypedText(message.substring(0, i + 1));
        i++;
        setTimeout(typeChar, speed);
      } else {
        setTimeout(() => {
          setShowCursor(false);
          setTimeout(() => {
            setShowPatient(true);
            setTimeout(() => {
              setShowAI2(true);
              setTimeout(() => {
                setShowChips(true);
              }, 600);
            }, 800);
          }, 600);
        }, 400);
      }
    }

    typeChar();
  }, [chatLang]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTyping();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [startTyping]);

  const t = {
    eyebrow: { en: 'The Core Experience', es: 'La Experiencia Central' },
    heading1: { en: 'The ', es: 'La Experiencia ' },
    headingAccent: { en: 'Medikah', es: 'Medikah' },
    heading2: { en: '\nExperience', es: '' },
    lead: {
      en: 'Our coordination technology guides you through intake, cross-border consent, and physician matching \u2014 all in a single conversation.',
      es: 'Nuestra tecnolog\u00eda de coordinaci\u00f3n lo gu\u00eda a trav\u00e9s de la admisi\u00f3n, consentimiento transfronterizo y emparejamiento con m\u00e9dicos \u2014 todo en una sola conversaci\u00f3n.',
    },
    placeholder: {
      en: 'Type your message... / Escribe tu mensaje...',
      es: 'Escribe tu mensaje... / Type your message...',
    },
    steps: [
      {
        num: '01',
        title: { en: 'Describe', es: 'Describa' },
        desc: { en: 'Tell our AI about your symptoms in English or Spanish', es: 'Cu\u00e9ntele a nuestra IA sobre sus s\u00edntomas' },
      },
      {
        num: '02',
        title: { en: 'Assess', es: 'Eval\u00fae' },
        desc: { en: 'Information organized for physician review and cross-border coordination', es: 'Informaci\u00f3n organizada para revisi\u00f3n m\u00e9dica y coordinaci\u00f3n transfronteriza' },
      },
      {
        num: '03',
        title: { en: 'Connect', es: 'Conecte' },
        desc: { en: 'Matched with a verified physician for consultation', es: 'Emparejado con un m\u00e9dico verificado para consulta' },
      },
    ],
    trustNote: {
      en: 'All conversations are encrypted and HIPAA-compliant',
      es: 'Todas las conversaciones son encriptadas y cumplen con HIPAA',
    },
  };

  return (
    <section ref={sectionRef} className="py-[clamp(4rem,8vh,8rem)] bg-linen-warm" id="chat-section">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,6vw,6rem)] mb-[clamp(3rem,5vh,4rem)] text-center">
        <div className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.3em] text-teal-500 mb-6">
          {t.eyebrow[locale]}
        </div>
        <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-normal uppercase leading-[0.95] text-deep-charcoal">
          {t.heading1[locale]}<span className="text-teal-500">{t.headingAccent[locale]}</span>{t.heading2[locale]}
        </h2>
        <p className="text-base leading-[1.7] text-text-secondary max-w-[560px] mx-auto mt-6">
          {t.lead[locale]}
        </p>
      </div>

      {/* Chat container */}
      <div className="max-w-[500px] mx-auto border border-warm-gray-800/[0.12] rounded-sm overflow-hidden bg-linen-white shadow-[0_16px_64px_rgba(45,43,41,0.12),0_2px_8px_rgba(45,43,41,0.06)] mx-4 sm:mx-auto">
        {/* Chat Header */}
        <div className="bg-warm-gray-800 px-5 py-4 flex items-center justify-between rounded-b-sm">
          <span className="font-body text-base font-normal text-white lowercase tracking-[0.02em]">
            medikah
          </span>
          <div className="flex border border-white/15 rounded-sm overflow-hidden">
            <button
              onClick={() => setChatLang('en')}
              className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-2.5 py-1 transition-all duration-200 border-none ${
                chatLang === 'en'
                  ? 'bg-teal-500 text-white'
                  : 'bg-transparent text-white/50 hover:text-white/80'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setChatLang('es')}
              className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-2.5 py-1 transition-all duration-200 border-none ${
                chatLang === 'es'
                  ? 'bg-teal-500 text-white'
                  : 'bg-transparent text-white/50 hover:text-white/80'
              }`}
            >
              ES
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-5 flex flex-col gap-4 min-h-[420px]">
          {/* AI Message 1 — auto-typing */}
          <div className="flex gap-2.5 items-start max-w-[85%]">
            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-body text-xs font-semibold">M</span>
            </div>
            <div className="bg-warm-gray-800 text-cream-300 px-[1.125rem] py-3.5 rounded-sm rounded-bl-[2px] font-body text-[0.9375rem] leading-[1.5]">
              {typedText}
              {showCursor && (
                <span className="inline-block w-0.5 h-[1em] bg-teal-400 ml-0.5 align-text-bottom animate-blink" />
              )}
            </div>
          </div>
          <div className="text-[0.6875rem] text-text-muted pl-[38px]">Just now</div>

          {/* Patient Message */}
          <div
            className="flex justify-end max-w-[85%] self-end transition-opacity duration-500"
            style={{ opacity: showPatient ? 1 : 0 }}
          >
            <div className="bg-teal-500 text-white px-[1.125rem] py-3.5 rounded-sm rounded-br-[2px] font-body text-[0.9375rem] leading-[1.5]">
              {PATIENT_MESSAGE[chatLang]}
            </div>
          </div>
          <div
            className="text-[0.6875rem] text-text-muted text-right transition-opacity duration-500"
            style={{ opacity: showPatient ? 1 : 0 }}
          >
            Just now
          </div>

          {/* AI Message 2 with structured assessment */}
          <div
            className="flex gap-2.5 items-start max-w-[85%] transition-opacity duration-500"
            style={{ opacity: showAI2 ? 1 : 0 }}
          >
            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-body text-xs font-semibold">M</span>
            </div>
            <div className="bg-warm-gray-800 text-cream-300 px-[1.125rem] py-3.5 rounded-sm rounded-bl-[2px] font-body text-[0.9375rem] leading-[1.5]">
              {AI_RESPONSE_2[chatLang]}

              {/* Assessment card */}
              <div className="mt-3 bg-white/[0.06] border border-white/10 rounded-sm p-3.5">
                <h4 className="font-body text-xs font-semibold uppercase tracking-[0.1em] text-teal-300 mb-2.5">
                  {ASSESSMENT_TITLE[chatLang]}
                </h4>
                {/* Progress bar */}
                <div className="w-full h-1 bg-white/10 rounded-[2px] overflow-hidden mb-3">
                  <div
                    className="h-full rounded-[2px]"
                    style={{
                      width: '40%',
                      background: 'linear-gradient(90deg, #2C7A8C, #7BBFCC)',
                    }}
                  />
                </div>
                <ul className="flex flex-col gap-1.5 list-none">
                  {ASSESSMENT_ITEMS[chatLang].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-[0.8125rem] text-cream-400">
                      <span className="w-[5px] h-[5px] rounded-full bg-teal-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reply Chips */}
        <div
          className="flex gap-2 flex-wrap px-5 pb-3 transition-opacity duration-500"
          style={{ opacity: showChips ? 1 : 0 }}
        >
          {CHIPS[chatLang].map((chip) => (
            <button
              key={chip}
              className="font-body text-[0.8125rem] font-medium text-teal-600 bg-teal-200 px-3.5 py-1.5 rounded-sm border-none cursor-pointer hover:bg-teal-300 hover:text-teal-700 transition-all duration-200"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="bg-linen-light px-4 py-3 flex gap-2.5 items-center border-t border-warm-gray-800/[0.06]">
          <input
            type="text"
            className="flex-1 bg-white border border-warm-gray-800/[0.12] rounded-sm px-4 py-2.5 font-body text-sm text-deep-charcoal placeholder:text-text-muted outline-none focus:border-teal-400 transition-colors"
            placeholder={t.placeholder[locale]}
            disabled
          />
          <button
            className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-teal-600 transition-colors"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Flow Steps */}
      <div className="max-w-[600px] mx-auto mt-[clamp(2.5rem,5vh,4rem)] grid grid-cols-1 sm:grid-cols-3 gap-8 text-center px-6">
        {t.steps.map((step) => (
          <div key={step.num}>
            <div className="font-heading text-[2rem] font-light text-teal-400 mb-2">
              {step.num}
            </div>
            <h4 className="font-heading text-[0.9375rem] font-medium uppercase tracking-[0.05em] text-deep-charcoal mb-1.5">
              {step.title[locale]}
            </h4>
            <p className="text-[0.8125rem] text-text-muted leading-[1.6]">
              {step.desc[locale]}
            </p>
          </div>
        ))}
      </div>

      {/* Trust note */}
      <div className="text-center mt-8 text-xs font-medium text-text-muted flex items-center justify-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {t.trustNote[locale]}
      </div>
    </section>
  );
}
