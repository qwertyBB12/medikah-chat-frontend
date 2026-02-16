const ITEMS = ['Supabase', 'OpenAI', 'Doxy.me', 'Resend', 'Netlify', 'Render'];

export default function Collaborators() {
  return (
    <section className="py-[clamp(6rem,12vh,12rem)] bg-linen text-center">
      <div className="font-body text-[0.625rem] font-medium uppercase tracking-[0.3em] text-teal-500 mb-16">
        Technology &amp; Compliance
      </div>
      <div className="max-w-[1200px] mx-auto px-[clamp(1.5rem,4vw,4rem)] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[clamp(2rem,4vw,4rem)] items-center justify-items-center">
        {ITEMS.map((item) => (
          <span
            key={item}
            className="font-heading text-sm font-medium uppercase tracking-[0.06em] text-text-muted opacity-50 hover:opacity-100 transition-opacity duration-300"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
