interface CurveDividerProps {
  from: string; // fill color of the arc (the section above)
  bg: string;   // background of the divider area (the section below)
  flip?: boolean; // true = arc opens downward
}

export default function CurveDivider({ from, bg, flip = false }: CurveDividerProps) {
  const d = flip
    ? 'M0,0 C480,40 960,40 1440,0 L1440,40 L0,40 Z'
    : 'M0,40 C480,0 960,0 1440,40 L1440,0 L0,0 Z';

  // When flipped, the U-dip path fills from edges inward, so the
  // destination color (bg/below) must be the SVG fill and the source
  // color (from/above) must be the container background.
  const containerBg = flip ? from : bg;
  const pathFill = flip ? bg : from;

  return (
    <div className="relative h-10 overflow-hidden -mb-px" style={{ background: containerBg }}>
      <svg
        className="absolute bottom-0 w-full h-10"
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={d} fill={pathFill} />
      </svg>
    </div>
  );
}
