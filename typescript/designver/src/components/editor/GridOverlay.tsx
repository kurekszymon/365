interface GridOverlayProps {
  enabled: boolean
  size: number
  width: number
  height: number
}

export function GridOverlay({
  enabled,
  size,
  width,
  height,
}: GridOverlayProps) {
  if (!enabled) return null
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
        `,
        backgroundSize: `${size}px ${size}px`,
        width,
        height,
      }}
    />
  )
}
