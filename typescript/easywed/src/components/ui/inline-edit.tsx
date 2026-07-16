import { PencilIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  className?: string
}

export const InlineEdit = ({ value, onSave, className }: InlineEditProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEditing = () => {
    setDraft(value)
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  const cancel = () => setEditing(false)

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={cn(
          "min-w-0 rounded border border-input bg-background px-2 py-0.5 ring-ring outline-none focus:ring-1",
          className
        )}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") cancel()
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      className={cn(
        "group inline-flex min-w-0 cursor-pointer items-center gap-1 underline-offset-2 hover:underline",
        className
      )}
      onClick={startEditing}
    >
      <span className="min-w-0 truncate">{value}</span>
      <PencilIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
    </button>
  )
}
