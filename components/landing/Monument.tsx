import { useRouter } from 'next/router';

export default function Monument() {
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  const t = {
    label: { en: 'Always open', es: 'Siempre abierto' },
    desc: {
      en: 'Real doctors. Real care. And a door that\u2019s always open. Start in your language, at any hour, from wherever you are.',
      es: 'Médicos reales. Atención real. Y una puerta que siempre está abierta. Comience en su idioma, a cualquier hora, desde donde esté.',
    },
  };

  return (
    <section className="min-h-[80vh] flex items-center bg-linen overflow-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-[clamp(1.5rem,6vw,6rem)] flex flex-col sm:flex-row justify-between items-end gap-8">
        <div className="font-heading text-[clamp(8rem,25vw,22rem)] font-medium text-teal-500 leading-[0.8] tracking-[-0.05em] opacity-90">
          24/7
        </div>
        <div className="max-w-[320px] pb-[clamp(1rem,2vw,2rem)] text-right">
          <div className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-text-muted">
            {t.label[locale]}
          </div>
          <p className="text-[0.9375rem] text-text-secondary leading-[1.7] mt-3">
            {t.desc[locale]}
          </p>
        </div>
      </div>
    </section>
  );
}
