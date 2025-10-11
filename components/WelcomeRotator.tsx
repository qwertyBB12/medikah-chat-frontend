import { useEffect, useState } from 'react';

const MESSAGES = [
  'welcome to medikah. let’s take care of you together.',
  'tell me what you’re feeling and we’ll walk through it calmly.',
  'tómate tu tiempo—we’re with you in english and spanish.',
  'if you need a doctor, we’ll help you find the right person.',
  'precision ai with latin american heart. estamos contigo.'
];

export default function WelcomeRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="px-4 py-6 md:py-8 lg:py-10">
      <div
        key={index}
        className="mx-auto max-w-4xl text-center text-3xl md:text-4xl lg:text-5xl leading-tight font-heading font-extrabold text-white/90 lowercase animate-fadeIn"
        aria-live="polite"
      >
        {MESSAGES[index]}
      </div>
    </div>
  );
}
