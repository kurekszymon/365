import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { usePlannerStore } from "@/stores/planner.store"
import {
  ADULT_AGE_GROUP,
  AGE_GROUP_PRESETS,
  ageGroupLabel,
  canonicalizeAgeGroup,
  collectAgeGroups,
  isAgeGroupPreset,
  sortAgeGroups,
} from "@/lib/ageGroup"
import { cn } from "@/lib/utils"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * Single-select age bracket for a guest: the presets (adult / 0-3 / 3-6) plus
 * every custom bracket already used in this wedding, and an input to type a new
 * one - which is how the ranges stay editable without a settings screen. There
 * is deliberately no separate "kid" pill: the kid headcount is inferred from
 * whichever bracket is picked (see `isKidAgeGroup`). Deselecting falls back to
 * "adult", the default. Mirrors the dietary pill row in `GuestFormFields`,
 * except a guest has exactly one group.
 */
export const GuestAgeGroupField = ({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) => {
  const { t } = useTranslation()
  const guests = usePlannerStore(useShallow((state) => state.guests))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  // Custom brackets the user removed from the row this session. They stay
  // hidden unless re-typed; presets are never dismissable.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())

  const options = sortAgeGroups(
    [...AGE_GROUP_PRESETS, ...collectAgeGroups(guests), value],
    t
  ).filter((o) => o === value || !dismissed.has(o))

  // Drops a custom bracket off this guest and hides it from the row.
  const deleteGroup = (group: string) => {
    setDismissed((prev) => new Set(prev).add(group))
    if (value === group) onChange(ADULT_AGE_GROUP)
  }

  const commitDraft = () => {
    const group = canonicalizeAgeGroup(draft)
    if (group) {
      // Re-typing a previously dismissed bracket brings it back.
      setDismissed((prev) => {
        if (!prev.has(group)) return prev
        const next = new Set(prev)
        next.delete(group)
        return next
      })
      onChange(group)
    }
    setDraft("")
    setAdding(false)
  }

  return (
    <Field>
      <FieldLabel>{t("guests.add.age_group")}</FieldLabel>
      <FieldContent className="flex-row flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value
          // Presets are a plain toggle; custom brackets get a delete affordance.
          if (isAgeGroupPreset(option)) {
            return (
              <Button
                key={option}
                variant={selected ? "default" : "outline"}
                className="rounded-full"
                onClick={() => onChange(option)}
              >
                {ageGroupLabel(t, option)}
              </Button>
            )
          }
          return (
            <span
              key={option}
              className={cn(
                "inline-flex h-8 items-center rounded-full border text-sm font-medium",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground"
              )}
            >
              <button
                type="button"
                onClick={() => onChange(option)}
                className="h-full rounded-l-full pr-1 pl-3"
              >
                {option}
              </button>
              <button
                type="button"
                onClick={() => deleteGroup(option)}
                aria-label={t("guests.add.age_group_delete", { group: option })}
                className={cn(
                  "flex h-full cursor-pointer items-center rounded-r-full pr-2 pl-1",
                  selected
                    ? "hover:bg-primary-foreground/20"
                    : "hover:bg-foreground/10"
                )}
              >
                <XIcon className="size-3.5 opacity-70" />
              </button>
            </span>
          )
        })}
        {adding ? (
          <span className="inline-flex items-center gap-1">
            <Input
              autoFocus
              type="text"
              className="h-8 w-32 rounded-full"
              placeholder={t("guests.add.age_group_custom_placeholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  commitDraft()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  setDraft("")
                  setAdding(false)
                }
              }}
            />
            <Button
              type="button"
              size="icon-sm"
              className="cursor-pointer rounded-full"
              aria-label={t("guests.add.age_group_confirm")}
              // Keep focus so the input doesn't blur-commit before this fires.
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitDraft}
            >
              <CheckIcon />
            </Button>
          </span>
        ) : (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setAdding(true)}
          >
            <PlusIcon className="size-4" />
            {t("guests.add.age_group_custom")}
          </Button>
        )}
      </FieldContent>
    </Field>
  )
}
