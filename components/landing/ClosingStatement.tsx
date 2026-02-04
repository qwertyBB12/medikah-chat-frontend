export default function ClosingStatement() {
  return (
    <section className="bg-inst-blue px-6 py-20 sm:py-24">
      <div className="max-w-[800px] mx-auto text-center">
        <p className="font-bold text-2xl sm:text-3xl md:text-[36px] text-white leading-[1.2] tracking-[-0.01em] mb-8">
          Care is too important to remain fragmented.
          <br className="hidden sm:block" />
          The Americas are too connected to leave care divided.
        </p>
        <p className="font-medium text-lg md:text-xl text-white/80 mb-10">
          Medikah coordinates what should never have been separated.
        </p>

        <a
          href="mailto:partnerships@medikah.health"
          className="inline-block px-6 py-3 text-white font-bold tracking-wide text-sm border border-white/40 hover:bg-white/10 transition rounded-sm"
        >
          Begin Coordination Inquiry
        </a>
      </div>
    </section>
  );
}
