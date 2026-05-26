import { useCallback, useEffect, useRef, useState } from 'react';

type Lang = 'es' | 'en';

// Doctor ↔ Medikah explainer. Beats escalate value (free essentials → AI →
// reach → patients → certification → cross-border) to engineer anticipation,
// anchoring "sin costo" at the open and close. Reveals one beat at a time with
// a typing indicator; starts when scrolled into view.
const HEADER: Record<Lang, string> = { es: 'Asistente para médicos', en: 'Physician assistant' };
const QUESTION: Record<Lang, string> = {
  es: '¿Qué es Medikah y qué traen para los médicos?',
  en: 'What is Medikah, and what are you bringing for physicians?',
};
const CLOSER: Record<Lang, string> = { es: 'Todo empieza sin costo.', en: 'It all starts at no cost.' };
const REPLAY: Record<Lang, string> = { es: '▸ Reproducir', en: '▸ Replay' };

type Beat = { es: string; en: string; tag?: { es: string; en: string } };
const BEATS: Beat[] = [
  { es: 'Para empezar, lo esencial — sin costo: tu correo, tu calendario y tu propio sitio web seguro para agendar y para que tus pacientes te encuentren. Personalízalo con tu marca o úsalo desde Medikah.',
    en: 'To start, the essentials — at no cost: your email, your calendar, and your own secure website to schedule and to help patients find you. Brand it as your own or run it from Medikah.',
    tag: { es: 'Gratis para médicos', en: 'Free for physicians' } },
  { es: 'Luego, los asistentes de IA llegan a tu práctica: agenda, reprogramación y apoyo en diagnósticos diferenciales.',
    en: 'Then the AI assistants arrive in your practice: scheduling, rescheduling, and differential-diagnosis support.' },
  { es: 'Telemedicina para atender pacientes fuera de tu ciudad — y pronto, en todo el continente.',
    en: 'Telemedicine to see patients beyond your city — and soon, across the hemisphere.' },
  { es: 'Y te conectamos con pacientes nuevos.',
    en: 'And we connect you with new patients.' },
  { es: 'Te capacitamos y certificamos en IA ética aplicada a la medicina, con expertos de Estados Unidos y de este lado del hemisferio — validado por New eXponential Thought Organization.',
    en: 'We train and certify you in ethical AI for medicine, with experts from the United States and this side of the hemisphere — validated by New eXponential Thought Organization.',
    tag: { es: 'Certificación validada', en: 'Validated certification' } },
  { es: 'Y abrimos puertas para que ejerzas en otros países. Muy pronto.',
    en: 'And we open doors for you to practice in other countries. Coming soon.' },
];

export default function CdmxDoctorChat({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const [askShown, setAskShown] = useState(false);
  const [visible, setVisible] = useState(0); // medikah beats revealed
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const T = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const play = useCallback(() => {
    clear();
    setAskShown(false); setVisible(0); setTyping(false); setDone(false);
    T(() => setAskShown(true), 400);
    let t = 1200;
    BEATS.forEach((_, i) => {
      T(() => setTyping(true), t);
      T(() => { setTyping(false); setVisible(i + 1); }, t + 900);
      t += 900 + 1500;
    });
    T(() => setDone(true), t);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        play();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, [play]);

  return (
    <div ref={ref} className="mx-auto mt-8 max-w-[520px]">
      <style jsx global>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div className="overflow-hidden rounded-lg border border-deep-charcoal/10 bg-white text-left shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between bg-inst-blue px-5 py-3.5">
          <span className="font-body text-sm font-medium lowercase tracking-[0.04em] text-white">medikah</span>
          <span className="font-body text-[0.7rem] uppercase tracking-[0.18em] text-white/55">{HEADER[lang]}</span>
        </div>

        {/* conversation */}
        <div className="flex max-h-[460px] flex-col gap-3.5 overflow-y-auto bg-clinical-surface px-5 py-6">
          {/* doctor question */}
          <div className={`flex justify-end transition-all duration-500 ${askShown ? 'opacity-100 translate-y-0' : 'translate-y-2 opacity-0'}`}>
            <div className="max-w-[82%] rounded-lg rounded-br-sm bg-teal-500 px-4 py-3 font-body text-[0.9rem] leading-relaxed text-white">
              {QUESTION[lang]}
            </div>
          </div>

          {/* medikah beats */}
          {BEATS.map((b, i) => (
            i < visible ? (
              <div key={i} className="flex gap-2.5 duration-500 animate-[fadeUp_0.5s_ease-out]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clinical-teal font-body text-xs font-bold text-white">M</div>
                <div className="max-w-[84%] rounded-lg rounded-bl-sm bg-inst-blue px-4 py-3 font-body text-[0.9rem] leading-relaxed text-white">
                  {b[lang]}
                  {b.tag && (
                    <span className="mt-2.5 inline-block rounded-sm bg-teal-400/20 px-2.5 py-1 font-body text-[0.7rem] font-semibold uppercase tracking-wider text-teal-300">
                      {b.tag[lang]}
                    </span>
                  )}
                </div>
              </div>
            ) : null
          ))}

          {/* typing indicator */}
          {typing && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clinical-teal font-body text-xs font-bold text-white">M</div>
              <div className="flex items-center gap-1 rounded-lg rounded-bl-sm bg-inst-blue px-4 py-3.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-300" />
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-deep-charcoal/[0.06] bg-white px-5 py-3">
          <span className={`font-body text-sm font-semibold text-clinical-teal transition-opacity duration-700 ${done ? 'opacity-100' : 'opacity-0'}`}>
            {CLOSER[lang]}
          </span>
          {done && (
            <button onClick={play} className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-archival-grey transition-colors hover:text-clinical-teal">
              {REPLAY[lang]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
