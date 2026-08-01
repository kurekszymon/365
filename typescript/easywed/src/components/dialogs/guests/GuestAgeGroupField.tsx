import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CheckIcon, PlusIcon } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { DeletableTagPill } from "./DeletableTagPill"
import { usePlannerStore } from "@/stores/planner.store"
import {
  ADULT_AGE_GROUP,
  AGE_GROUP_PRESETS,
  AGE_GROUP_TONE,
  ageGroupLabel,
  canonicalizeAgeGroup,
  collectAgeGroups,
  isAgeGroupPreset,
  sortAgeGroups,
} from "@/lib/ageGroup"
import { TAG_TONE_SOLID } from "@/lib/tagTone"
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
  // Brackets typed this session. A guest has exactly one group, so unlike the
  // dietary row we can't recover them from the current value - without this,
  // typing a second bracket would drop the first off the row until some guest
  // was actually saved with it.
  const [created, setCreated] = useState<ReadonlySet<string>>(new Set())

  const options = sortAgeGroups(
    [...AGE_GROUP_PRESETS, ...collectAgeGroups(guests), ...created, value],
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
      setCreated((prev) => (prev.has(group) ? prev : new Set(prev).add(group)))
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
          // Adults are the default and never earn a badge in the guest list, so
          // that pill stays neutral; every child bracket carries the one age
          // tone, matching the badge the guest will get.
          const isAdult = option === ADULT_AGE_GROUP
          // Presets are a plain toggle; custom brackets get a delete affordance.
          if (isAgeGroupPreset(option)) {
            return (
              <Button
                key={option}
                variant={selected && isAdult ? "default" : "outline"}
                className={cn(
                  "rounded-full",
                  selected && !isAdult && TAG_TONE_SOLID[AGE_GROUP_TONE]
                )}
                onClick={() => onChange(option)}
              >
                {ageGroupLabel(t, option)}
              </Button>
            )
          }
          return (
            <DeletableTagPill
              key={option}
              label={option}
              tone={AGE_GROUP_TONE}
              selected={selected}
              deleteLabel={t("guests.add.age_group_delete", { group: option })}
              onToggle={() => onChange(option)}
              onDelete={() => deleteGroup(option)}
            />
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
