import React from "react";

/**
 * The "before": a phone photo of the plan as the couple had it - a pencil
 * sketch on a page torn from a lined notebook, shot at an angle and out of
 * focus. Circles for tables and a box for the dance floor, the names beside
 * them only scrawls. Nothing on it is meant to be read, which is the point
 * mum makes about it.
 */
const PAPER = "#f2eee2";
const RULE = "#a9bfd6";
const MARGIN = "#d9a3a3";
const PENCIL = "#5c5a57";
/** The table beside them in the room the photo was taken in. */
const DESK = "#8a7d6b";

/** A scrawled name: a short wavy stroke, different each time from its seed. */
const scrawl = (x: number, y: number, width: number, seed: number): string => {
  const points: string[] = [`M ${x} ${y}`];
  for (let i = 1; i <= 6; i++) {
    const px = x + (width * i) / 6;
    const py = y + Math.sin(seed * 3.1 + i * 1.9) * 3;
    points.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return points.join(" ");
};

/** The tables as the couple pencilled them: two columns round the dance floor. */
const CIRCLES = [
  { x: 62, y: 118 },
  { x: 188, y: 112 },
  { x: 58, y: 196 },
  { x: 192, y: 200 },
  { x: 76, y: 270 },
  { x: 174, y: 274 },
];

export const SketchPhoto: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <svg width={width} height={height} viewBox="0 0 250 320" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
    <defs>
      <filter id="sketch-photo-blur">
        <feGaussianBlur stdDeviation="2.1" />
      </filter>
      <radialGradient id="sketch-photo-vignette" cx="45%" cy="40%" r="75%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
      </radialGradient>
    </defs>
    <rect width={250} height={320} fill={DESK} />
    <g filter="url(#sketch-photo-blur)">
      {/* The page, skewed as a hand holds a phone over a table. */}
      <g transform="translate(18 10) rotate(-5 110 150) skewX(-4)">
        <rect width={222} height={300} fill={PAPER} />
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1={0} x2={222} y1={26 + i * 17} y2={26 + i * 17} stroke={RULE} strokeWidth={1} />
        ))}
        <line x1={26} x2={26} y1={0} y2={300} stroke={MARGIN} strokeWidth={1.4} />
        {/* The couple's table along the top wall. */}
        <rect x={70} y={36} width={96} height={22} fill="none" stroke={PENCIL} strokeWidth={1.8} />
        <path d={scrawl(84, 72, 64, 1)} stroke={PENCIL} strokeWidth={1.3} fill="none" />
        {/* The dance floor, hatched. */}
        <rect x={98} y={150} width={50} height={70} fill="none" stroke={PENCIL} strokeWidth={1.6} />
        <path d="M 100 160 L 146 152 M 100 176 L 146 168 M 100 192 L 146 184 M 100 208 L 146 200" stroke={PENCIL} strokeWidth={0.9} />
        {CIRCLES.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={19} fill="none" stroke={PENCIL} strokeWidth={1.7} />
            <path d={scrawl(c.x - 16, c.y + 30, 34, i + 2)} stroke={PENCIL} strokeWidth={1.2} fill="none" />
            <path d={scrawl(c.x - 12, c.y + 38, 26, i + 7)} stroke={PENCIL} strokeWidth={1.1} fill="none" />
          </g>
        ))}
        {/* Crossings-out and an arrow - the plan changed on paper too. */}
        <path d="M 150 250 L 206 236 M 152 238 L 204 250" stroke={PENCIL} strokeWidth={1.2} />
        <path d="M 40 60 Q 30 90 46 104 M 42 98 L 46 104 L 50 96" stroke={PENCIL} strokeWidth={1.2} fill="none" />
      </g>
    </g>
    <rect width={250} height={320} fill="url(#sketch-photo-vignette)" />
    {/* Indoor light, a touch washed out. */}
    <rect width={250} height={320} fill="#fff6e0" opacity={0.12} />
  </svg>
);
