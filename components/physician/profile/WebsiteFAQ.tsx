import { useState } from 'react';
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
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-16 max-w-3xl">
            {isEs ? 'Respuestas a sus preguntas' : 'Answers to your questions'}
          </h2>

          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-[12px] border border-border-line shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="flex items-center gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-clinical-teal/10 text-clinical-teal font-dm-sans font-bold text-sm flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-dm-sans font-bold text-deep-charcoal">
                      {faq.question}
                    </span>
                  </span>
                  <svg
                    className={`flex-shrink-0 w-5 h-5 text-archival-grey transition-transform duration-200 ${
                      openIndex === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-5 pl-[72px]">
                    <p className="font-dm-sans text-sm text-body-slate leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
