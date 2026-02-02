import { useEffect, useState } from 'react';

const MESSAGES = [
  'Welcome to Medikah.',
  'Tell us what brings you in today.',
  'Take your time. We are here.',
  'English and Spanish, always.',
  'Your doctor will be ready for you.',
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
    <div className="px-6 py-8 md:py-12">
      <div
        key={index}
        className="mx-auto max-w-2xl text-center text-2xl md:text-3xl lg:text-4xl leading-snug font-light tracking-wide text-body-slate/70 animate-fadeIn"
        aria-live="polite"
      >
        {MESSAGES[index]}
      </div>
    </div>
  );
}
