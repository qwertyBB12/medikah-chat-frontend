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
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] px-6 py-8 md:py-12">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(44,122,140,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div
        key={index}
        className="relative z-10 mx-auto max-w-lg text-center"
        aria-live="polite"
      >
        <p className="font-dm-serif text-[36px] text-inst-blue leading-[1.2] tracking-[-0.02em] animate-welcomeFade">
          {MESSAGES[index]}
        </p>
        <p className="font-dm-sans text-xl font-normal text-body-slate leading-relaxed mt-4 max-w-[480px] mx-auto animate-welcomeFadeDelay">
          Care without distance.
        </p>
      </div>
    </div>
  );
}
