import type { ReactNode } from "react"

type AddCardProps = {
  label: string
  onClick: () => void
  children: ReactNode
}

// One tappable preset card in the "Dodaj do sali" grid - a shape/icon preview
// plus a label. Shared by both table and fixture presets; the preview swatch
// is passed in as children so this stays presentation-only.
export const AddCard = ({ label, onClick, children }: AddCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-colors hover:bg-accent/50"
  >
    {children}
    <span className="text-[11.5px] font-semibold">{label}</span>
  </button>
)
