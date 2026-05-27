interface HighlightedTextProps {
  text: string
  highlights: string[]
}

export function HighlightedText({ text, highlights }: HighlightedTextProps) {
  if (highlights.length === 0) return <span>{text}</span>

  const escaped = highlights.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi")
  const parts = text.split(pattern)

  return (
    <span>
      {parts.map((part, i) => {
        const isHighlight = highlights.some(
          (h) => h.toLowerCase() === part.toLowerCase(),
        )
        return isHighlight ? (
          <mark
            key={i}
            className="bg-amber-300/30 text-amber-200 rounded px-0.5 font-semibold"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </span>
  )
}
