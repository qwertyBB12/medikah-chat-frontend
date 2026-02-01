const ITEMS = [
  {
    heading: 'Secure video consultations',
    body: 'See a doctor from wherever you are. No downloads, no complicated setup.',
    bodyEs: 'Consulta a un m\u00e9dico desde donde est\u00e9s. Sin descargas ni configuraciones.',
  },
  {
    heading: 'Bilingual care',
    body: 'English and Spanish at every step \u2014 from intake to consultation.',
    bodyEs: 'Ingl\u00e9s y espa\u00f1ol en cada paso \u2014 desde el ingreso hasta la consulta.',
  },
  {
    heading: 'Thoughtful intake',
    body: 'Share what brings you in at your own pace. Your doctor receives a clear summary before your visit.',
    bodyEs: 'Comparte lo que te trae a tu ritmo. Tu m\u00e9dico recibe un resumen claro antes de tu cita.',
  },
];

export default function Promise() {
  return (
    <section className="bg-cream-200 px-6 py-24 sm:py-32">
      <div className="max-w-3xl mx-auto space-y-20">
        {ITEMS.map((item) => (
          <div key={item.heading} className="space-y-4">
            <h3 className="font-heading font-normal text-xl uppercase tracking-wider text-navy-900">
              {item.heading}
            </h3>
            <p className="font-body text-base text-navy-900/70 leading-relaxed">
              {item.body}
            </p>
            <p className="font-body text-sm text-navy-900/35 leading-relaxed">
              {item.bodyEs}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
