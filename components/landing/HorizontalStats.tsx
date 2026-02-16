import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const SLIDES = [
  {
    stat: '2',
    label: { en: 'Countries', es: 'Pa\u00edses' },
    context: {
      en: 'Cross-border healthcare coordination between the United States and Mexico, with more regions planned.',
      es: 'Coordinaci\u00f3n de salud transfronteriza entre Estados Unidos y M\u00e9xico, con m\u00e1s regiones planeadas.',
    },
  },
  {
    stat: '100%',
    label: { en: 'Bilingual', es: 'Biling\u00fce' },
    context: {
      en: 'Every conversation, every form, every consultation available in both English and Spanish. Your language, your care.',
      es: 'Cada conversaci\u00f3n, cada formulario, cada consulta disponible en ingl\u00e9s y espa\u00f1ol. Su idioma, su atenci\u00f3n.',
    },
  },
  {
    stat: '24/7',
    label: { en: 'AI Triage', es: 'Triaje IA' },
    context: {
      en: 'Our AI health assistant is always available. Describe your symptoms any time, get triaged, and connect with a physician.',
      es: 'Nuestro asistente de salud con IA siempre est\u00e1 disponible. Describa sus s\u00edntomas en cualquier momento.',
    },
  },
];

export default function HorizontalStats() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    function updateHorizontal() {
      const wrapper = wrapperRef.current;
      const slides = slidesRef.current;
      if (!wrapper || !slides) return;

      const wrapperTop = wrapper.offsetTop;
      const scrollInWrapper = window.scrollY - wrapperTop;
      const scrollRange = wrapper.offsetHeight - window.innerHeight;

      if (scrollInWrapper < 0 || scrollInWrapper > scrollRange) return;

      const progress = scrollInWrapper / scrollRange;
      const maxTranslate = (SLIDES.length - 1) * window.innerWidth;
      const translateX = progress * maxTranslate;

      slides.style.transform = `translateX(-${translateX}px)`;

      const currentSlide = Math.round(progress * (SLIDES.length - 1));
      setActiveSlide(currentSlide);
    }

    window.addEventListener('scroll', updateHorizontal, { passive: true });
    window.addEventListener('resize', updateHorizontal);
    return () => {
      window.removeEventListener('scroll', updateHorizontal);
      window.removeEventListener('resize', updateHorizontal);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative" style={{ height: '300vh' }}>
      <div
        className="sticky top-0 h-screen overflow-hidden flex items-center relative"
        style={{
          background: 'linear-gradient(135deg, #1A1918 0%, #2D2B29 100%)',
        }}
      >
        {/* Grain */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Side labels */}
        <div
          className="absolute top-1/2 left-[clamp(1rem,2vw,2rem)] -translate-y-1/2 font-body text-[0.625rem] font-medium uppercase tracking-[0.3em] text-white/[0.12] z-[2]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Impact
        </div>
        <div
          className="absolute top-1/2 right-[clamp(1rem,2vw,2rem)] -translate-y-1/2 font-body text-[0.625rem] font-medium uppercase tracking-[0.3em] text-white/[0.12] z-[2]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Medikah Health
        </div>

        {/* Slides */}
        <div
          ref={slidesRef}
          className="flex relative z-[2] will-change-transform"
          style={{ transition: 'transform 0.1s linear' }}
        >
          {SLIDES.map((slide) => (
            <div
              key={slide.stat}
              className="min-w-[100vw] h-screen flex flex-col items-center justify-center px-[clamp(2rem,6vw,8rem)]"
            >
              <div className="font-heading text-[clamp(6rem,20vw,18rem)] font-light text-teal-400 leading-[0.85] tracking-[-0.04em]">
                {slide.stat}
              </div>
              <div className="font-body text-[clamp(0.75rem,1.2vw,1rem)] font-medium uppercase tracking-[0.2em] text-cream-500 mt-[clamp(1rem,2vh,2rem)]">
                {slide.label[locale]}
              </div>
              <p className="font-body text-base text-cream-400 max-w-[400px] text-center mt-6 leading-[1.7]">
                {slide.context[locale]}
              </p>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-[clamp(2rem,4vh,4rem)] left-1/2 -translate-x-1/2 flex gap-3 z-[3]">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === activeSlide
                  ? 'bg-teal-400 scale-150'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
