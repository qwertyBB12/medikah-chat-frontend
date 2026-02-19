import { useState, useRef, useEffect } from 'react';
import FadeInSection from './FadeInSection';

interface Props {
  faqs?: { question: string; answer: string }[];
  isEs: boolean;
}

export default function WebsiteFAQ({ faqs, isEs }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) {
    return null;
  }

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-16 max-w-3xl">
            {isEs ? 'Respuestas a sus preguntas' : 'Answers to your questions'}
          </h2>

          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

function FAQItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: { question: string; answer: string };
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  return (
    <div className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className="flex items-center gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/[0.08] text-teal-500 font-dm-sans font-bold text-sm flex items-center justify-center">
            {index + 1}
          </span>
          <span className="font-dm-sans font-bold text-deep-charcoal">
            {faq.question}
          </span>
        </span>
        <svg
          className={`flex-shrink-0 w-5 h-5 text-archival-grey transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        ref={contentRef}
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isOpen ? `${height}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-6 pb-5 pl-[72px]">
          <p className="font-dm-sans text-sm text-body-slate leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
