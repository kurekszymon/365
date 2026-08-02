// The logo mark on its own - the icon file in /public wraps this same shape in
// a background plate, which a header doesn't want. Colors are hardcoded rather
// than themed: this is the brand mark, so it reads identically in every
// palette (same reasoning as the seat colors in styles.css).
const GREEN = "#43684b"
const SAGE = "#9ec2a2"
const TERRACOTTA = "#a9592b"

const SAGE_DOTS = [
  { cx: 60, cy: 107 },
  { cx: 13, cy: 60 },
  { cx: 93, cy: 27 },
  { cx: 27, cy: 93 },
  { cx: 93, cy: 93 },
  { cx: 27, cy: 27 },
]

export const BrandMark = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="33" fill={GREEN} />
      {SAGE_DOTS.map((dot) => (
        <circle key={`${dot.cx}-${dot.cy}`} {...dot} r="9" fill={SAGE} />
      ))}
      <circle cx="60" cy="13" r="10" fill={TERRACOTTA} />
      <circle cx="107" cy="60" r="10" fill={TERRACOTTA} />
    </svg>
  )
}
