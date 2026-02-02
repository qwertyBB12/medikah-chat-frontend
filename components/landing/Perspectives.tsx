export interface SanityPerspective {
  _id: string;
  _type: string;
  title: string;
  slug?: { current: string };
  language?: string;
  narrativeOwner?: string;
}

const TYPE_LABELS: Record<string, string> = {
  essay: 'Essay',
  opEd: 'Op-Ed',
  video: 'Video',
  podcastEpisode: 'Podcast',
};

interface Props {
  items: SanityPerspective[];
}

export default function Perspectives({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-clinical-teal px-6 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-extrabold text-2xl sm:text-3xl lowercase text-center mb-4 tracking-tight text-white">
          perspectives
        </h2>
        <p className="font-light text-center text-white/70 mb-14 max-w-xl mx-auto">
          Curated writing and conversations from across the ecosystem.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <article
              key={item._id}
              className="bg-white/15 backdrop-blur-sm p-6 space-y-3 hover:bg-white/25 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-inst-blue bg-white/30 px-2 py-0.5">
                  {TYPE_LABELS[item._type] ?? item._type}
                </span>
                {item.language && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                    {item.language}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base lowercase text-white leading-snug">
                {item.title}
              </h3>
              {item.narrativeOwner && (
                <p className="text-xs text-white/50">
                  {item.narrativeOwner}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
