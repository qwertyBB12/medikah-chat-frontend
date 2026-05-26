import { useCallback, useEffect, useRef, useState } from 'react';

type Lang = 'es' | 'en';
type From = 'doc' | 'medikah';
type Msg = { from: From; es: string; en: string; tag?: { es: string; en: string } };

// Doctor ⇄ Medikah explainer, played inside a fixed phone screen (scrolls
// internally, never grows). Sequencing mirrors the real rollout: free basics →
// training on AI inside each tool (become an expert — the springboard) → deeper
// AI for practice/patients/business → certification (NeXT) → then telemedicine,
// new patients, and cross-border practice later.
const HEADER: Record<Lang, string> = { es: 'Asistente para médicos', en: 'Physician assistant' };
const CLOSER: Record<Lang, string> = { es: 'Todo empieza sin costo.', en: 'It all starts at no cost.' };
const REPLAY: Record<Lang, string> = { es: '▸ Reproducir', en: '▸ Replay' };

const SCRIPT: Msg[] = [
  { from: 'doc', es: '¿Qué es Medikah y qué traen para los médicos?', en: 'What is Medikah, and what are you bringing for physicians?' },
  { from: 'medikah', es: 'Primero, lo esencial — sin costo: tu correo, tu calendario y tu propio sitio web seguro para agendar y para que tus pacientes te encuentren.', en: 'First, the essentials — at no cost: your email, your calendar, and your own secure website to schedule and to help patients find you.', tag: { es: 'Gratis para médicos', en: 'Free for physicians' } },
  { from: 'doc', es: '¿Y la inteligencia artificial?', en: 'And the artificial intelligence?' },
  { from: 'medikah', es: 'Ahí empieza lo bueno. Te capacitamos: la IA llega dentro de cada herramienta, y te enseñamos a usarla paso a paso.', en: "That's where it gets good. We train you: AI arrives inside each tool, and we teach you to use it step by step." },
  { from: 'doc', es: '¿Qué tan a fondo?', en: 'How deep does it go?' },
  { from: 'medikah', es: 'Hasta volverte experto — que entiendas la IA por completo. Esa formación es tu trampolín hacia un uso más profundo: para tu práctica, tus pacientes y el lado de negocio.', en: 'Until you become an expert — until you fully understand AI. That training is your springboard into deeper use: for your practice, your patients, and the business side.' },
  { from: 'medikah', es: 'Y te certificamos en IA ética aplicada a la medicina, validado por New eXponential Thought Organization.', en: 'And we certify you in ethical AI for medicine, validated by New eXponential Thought Organization.', tag: { es: 'Certificación validada', en: 'Validated certification' } },
  { from: 'doc', es: '¿Y después?', en: 'And after that?' },
  { from: 'medikah', es: 'Después llega lo demás: telemedicina para pacientes fuera de tu ciudad, pacientes nuevos y, más adelante, puertas para ejercer en otros países.', en: 'Then comes the rest: telemedicine for patients beyond your city, new patients, and — later — doors to practice in other countries.' },
];

export default function CdmxDoctorChat({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const T = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const play = useCallback(() => {
    clear();
    setVisible(0); setTyping(false); setDone(false);
    let t = 450;
    SCRIPT.forEach((m, i) => {
      if (m.from === 'medikah') {
        T(() => setTyping(true), t);
        T(() => { setTyping(false); setVisible(i + 1); }, t + 950);
        t += 950 + 1500;
      } else {
        T(() => setVisible(i + 1), t);
        t += 850;
      }
    });
    T(() => setDone(true), t);
  }, []);

  // autoscroll the phone screen to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [visible, typing]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) { started.current = true; play(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, [play]);

  return (
    <div ref={ref} className="mx-auto mt-8 w-full max-w-[380px]">
      <style jsx global>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div className="overflow-hidden rounded-[28px] border border-deep-charcoal/10 bg-white text-left shadow-2xl">
        {/* phone app bar */}
        <div className="flex items-center justify-between bg-inst-blue px-5 py-3.5">
          <span className="font-body text-sm font-medium lowercase tracking-[0.04em] text-white">medikah</span>
          <span className="font-body text-[0.68rem] uppercase tracking-[0.16em] text-white/55">{HEADER[lang]}</span>
        </div>

        {/* fixed phone screen — scrolls internally */}
        <div ref={scrollRef} className="h-[440px] space-y-3 overflow-y-auto bg-clinical-surface px-4 py-5">
          {SCRIPT.slice(0, visible).map((m, i) => (
            m.from === 'doc' ? (
              <div key={i} className="flex justify-end" style={{ animation: 'fadeUp 0.45s ease-out' }}>
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-teal-500 px-4 py-2.5 font-body text-[0.88rem] leading-relaxed text-white">
                  {m[lang]}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2" style={{ animation: 'fadeUp 0.45s ease-out' }}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clinical-teal font-body text-[0.6rem] font-bold text-white">M</div>
                <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-inst-blue px-4 py-2.5 font-body text-[0.88rem] leading-relaxed text-white">
                  {m[lang]}
                  {m.tag && (
                    <span className="mt-2 inline-block rounded-sm bg-teal-400/20 px-2.5 py-0.5 font-body text-[0.66rem] font-semibold uppercase tracking-wider text-teal-300">
                      {m.tag[lang]}
                    </span>
                  )}
                </div>
              </div>
            )
          ))}

          {typing && (
            <div className="flex gap-2" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clinical-teal font-body text-[0.6rem] font-bold text-white">M</div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-inst-blue px-4 py-3">
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
            <button onClick={play} className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-archival-grey transition-colors hover:text-clinical-teal">
              {REPLAY[lang]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
