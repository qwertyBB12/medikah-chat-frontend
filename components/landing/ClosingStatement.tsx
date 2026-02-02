export default function ClosingStatement() {
  return (
    <section className="bg-inst-blue px-6 py-24 sm:py-32">
      <div className="max-w-[900px] mx-auto text-center">
        <p className="font-bold text-3xl md:text-4xl text-white leading-snug mb-12">
          Healthcare is too important to remain fragmented.
          <br className="hidden sm:block" />
          The Americas are too connected to leave care divided.
        </p>
        <p className="font-bold text-2xl md:text-3xl text-white/80 mb-14">
          Medikah coordinates what should never have been separated.
        </p>

        <a
          href="mailto:partnerships@medikah.com"
          className="inline-block px-8 py-4 text-white font-bold tracking-wide text-lg border border-white/40 hover:bg-white/10 transition rounded-sm"
        >
          Begin Coordination Inquiry
        </a>
      </div>
    </section>
  );
}
