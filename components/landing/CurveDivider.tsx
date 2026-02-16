interface CurveDividerProps {
  from: string; // fill color of the arc (the section above)
  bg: string;   // background of the divider area (the section below)
  flip?: boolean; // true = arc opens downward
}

export default function CurveDivider({ from, bg, flip = false }: CurveDividerProps) {
  const d = flip
    ? 'M0 0 C360 40 1080 40 1440 0 L1440 40 L0 40 Z'
    : 'M0 40 C360 0 1080 0 1440 40 L1440 0 L0 0 Z';

  return (
    <div className="relative h-10 overflow-hidden" style={{ background: bg }}>
      <svg
        className="absolute bottom-0 w-full h-10"
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={d} fill={from} />
      </svg>
    </div>
  );
}
