import * as React from "react"

import { Input } from "@/components/ui/input"

interface NumberInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> {
  value: number
  onValueChange: (value: number) => void
}

// Controlled number input that stays erasable: while the user edits, the raw
// text (including "") is shown from a local draft, and onValueChange only
// fires for parseable values. Blurring an empty/invalid draft reverts to the
// last committed value instead of snapping to 0.
function NumberInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: NumberInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null)

  return (
    <Input
      type="number"
      value={draft ?? value}
      onChange={(e) => {
        setDraft(e.target.value)
        const next = Number(e.target.value)
        if (e.target.value !== "" && Number.isFinite(next)) {
          onValueChange(next)
        }
      }}
      onBlur={(e) => {
        setDraft(null)
        onBlur?.(e)
      }}
      {...props}
    />
  )
}

export { NumberInput }
