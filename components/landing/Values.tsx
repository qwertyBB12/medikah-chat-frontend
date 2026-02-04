const VALUES = [
  {
    title: 'Continuity',
    body: 'Your medical history shouldn\u2019t stop at a border. Your relationship with your physician shouldn\u2019t end because you moved. Healthcare requires continuity\u2014across cities, countries, contexts. Medikah coordinates medical records, provider relationships, and patient histories across jurisdictions. Your care narrative remains unbroken.',
  },
  {
    title: 'Access',
    body: 'Excellent physicians practice throughout the Americas. Institutional barriers\u2014not medical capability\u2014prevent patients from connecting with them. Medikah removes coordination barriers while maintaining regulatory integrity. Licensed providers. Credentialed networks. Clear jurisdictional frameworks. Access to expertise, not shortcuts around compliance.',
  },
  {
    title: 'Coordination',
    body: 'Healthcare fragmentation harms everyone. Insurers, hospitals, physicians, and patients all benefit when systems work together. Medikah exists to make that coordination real. We don\u2019t replace existing systems. We connect them. We don\u2019t bypass regulations. We navigate them. We don\u2019t create new bureaucracy. We reduce it.',
  },
];

export default function Values() {
  return (
    <section className="bg-gradient-to-b from-white via-clinical-surface to-white px-6 py-24 sm:py-[100px]">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-extrabold text-4xl md:text-[56px] text-inst-blue text-center mb-16 leading-[1.15] tracking-[-0.01em]">
          Healthcare Requires Three Things Most Systems Don&rsquo;t Provide
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
          {VALUES.map((item) => (
            <div key={item.title} className="space-y-4">
              <h3 className="font-extrabold text-2xl text-clinical-teal">
                {item.title}
              </h3>
              <p className="text-lg text-body-slate leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
