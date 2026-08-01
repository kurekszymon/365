import { XIcon } from "lucide-react"
import type { TagTone } from "@/lib/tagTone"
import { TAG_TONE_SOLID } from "@/lib/tagTone"
import { cn } from "@/lib/utils"

/**
 * A user-typed dietary tag or age bracket in the guest form: a split pill whose
 * left half toggles the value and whose right half deletes it from the offered
 * options. Shared by `GuestFormFields` (dietary, multi-select) and
 * `GuestAgeGroupField` (age, single-select) - the two differ only in their
 * handlers and their tone, so the markup lives here rather than twice.
 *
 * Only the selected pill takes on the value's tone - the form shows every
 * option at once, so tinting them all turned the dialog into a paint chart.
 * Unselected stays neutral; picking one previews the color it will have on the
 * guest row.
 */
export const DeletableTagPill = ({
  label,
  tone,
  selected,
  deleteLabel,
  onToggle,
  onDelete,
}: {
  label: string
  tone: TagTone
  selected: boolean
  deleteLabel: string
  onToggle: () => void
  onDelete: () => void
}) => (
  <span
    className={cn(
      "inline-flex h-8 items-center rounded-full border text-sm font-medium transition-colors",
      selected
        ? TAG_TONE_SOLID[tone]
        : "border-border bg-secondary text-secondary-foreground"
    )}
  >
    <button
      type="button"
      onClick={onToggle}
      className="h-full cursor-pointer rounded-l-full pr-1 pl-3"
    >
      {label}
    </button>
    <button
      type="button"
      onClick={onDelete}
      aria-label={deleteLabel}
      className={cn(
        "flex h-full cursor-pointer items-center rounded-r-full pr-2 pl-1",
        selected ? "hover:bg-background/20" : "hover:bg-foreground/10"
      )}
    >
      <XIcon className="size-3.5 opacity-70" />
    </button>
  </span>
)
