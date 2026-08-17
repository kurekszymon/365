import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CheckIcon, Info, PlusIcon } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { GuestAgeGroupField } from "./GuestAgeGroupField"
import { DeletableTagPill } from "./DeletableTagPill"
import type { Dietary } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import {
  DIETARY_PRESETS,
  MAX_DIETARY_TAGS,
  canonicalizeDietary,
  collectDietaryTags,
  dietaryLabel,
  dietaryTone,
  isDietaryPreset,
  sortDietaryTags,
} from "@/lib/dietary"
import { TAG_TONE_SOLID } from "@/lib/tagTone"
import { cn } from "@/lib/utils"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type GuestFormValues = {
  name: string
  dietary: Array<Dietary>
  // Always an explicit value; ADULT_AGE_GROUP is the default (see EMPTY_GUEST).
  ageGroup: string
  note: string
}

// Controlled name/dietary/age-group/note fields shared by the add and edit
// guest dialogs so the two stay in sync. The parent owns the values and
// persistence.
export const GuestFormFields = ({
  value,
  onChange,
}: {
  value: GuestFormValues
  onChange: (value: GuestFormValues) => void
}) => {
  const { t } = useTranslation()
  const guests = usePlannerStore(useShallow((state) => state.guests))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  // Custom tags the user removed from the suggestion row this session. They stay
  // hidden unless re-typed; presets are never dismissable.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())

  // Presets + every tag already used in this wedding + the guest's own tags, so
  // a just-added custom tag stays visible as an active pill. A dismissed tag is
  // hidden unless it is still selected on this guest.
  const options = sortDietaryTags(
    [...DIETARY_PRESETS, ...collectDietaryTags(guests), ...value.dietary],
    t
  ).filter((o) => value.dietary.includes(o) || !dismissed.has(o))
  const atLimit = value.dietary.length >= MAX_DIETARY_TAGS

  const toggleDietary = (option: Dietary) => {
    const selected = value.dietary.includes(option)
    if (!selected && atLimit) return
    onChange({
      ...value,
      dietary: selected
        ? value.dietary.filter((o) => o !== option)
        : [...value.dietary, option],
    })
  }

  // Drops a custom tag off this guest and hides it from the suggestion row.
  const deleteTag = (tag: Dietary) => {
    setDismissed((prev) => new Set(prev).add(tag))
    if (value.dietary.includes(tag)) {
      onChange({ ...value, dietary: value.dietary.filter((o) => o !== tag) })
    }
  }

  const commitDraft = () => {
    const tag = canonicalizeDietary(draft)
    if (tag && !value.dietary.includes(tag) && !atLimit) {
      // Re-typing a previously dismissed tag brings it back.
      setDismissed((prev) => {
        if (!prev.has(tag)) return prev
        const next = new Set(prev)
        next.delete(tag)
        return next
      })
      onChange({ ...value, dietary: [...value.dietary, tag] })
    }
    setDraft("")
    setAdding(false)
  }

  return (
    <>
      <Field>
        <FieldLabel>{t("guests.add.name")}</FieldLabel>
        <FieldContent>
          <Input
            placeholder={t("guests.add.name_placeholder")}
            type="text"
            className="w-full rounded-md border"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel className="gap-1.5">
          {t("guests.add.dietary_preferences")}
          {/* Custom tags are free text, and "why" answers here are Art. 9 GDPR
              special-category data about someone who never signed up. The terms
              (§ 14 ust. 4) put that obligation on the user - this is where they
              actually see it. Focusable so the hint is reachable by keyboard
              and tap, not hover only. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="cursor-help text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("guests.add.dietary_hint")}
              >
                <Info className="size-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64">
              {t("guests.add.dietary_hint")}
            </TooltipContent>
          </Tooltip>
        </FieldLabel>
        <FieldContent className="flex-row flex-wrap gap-1.5">
          {options.map((option) => {
            const selected = value.dietary.includes(option)
            const tone = dietaryTone(option)
            // Presets are a plain toggle; custom tags get a delete affordance.
            if (isDietaryPreset(option)) {
              return (
                <Button
                  key={option}
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    selected && TAG_TONE_SOLID[tone]
                  )}
                  aria-pressed={selected}
                  onClick={() => toggleDietary(option)}
                >
                  {dietaryLabel(t, option)}
                </Button>
              )
            }
            return (
              <DeletableTagPill
                key={option}
                label={option}
                tone={tone}
                selected={selected}
                deleteLabel={t("guests.add.dietary_delete", { tag: option })}
                onToggle={() => toggleDietary(option)}
                onDelete={() => deleteTag(option)}
              />
            )
          })}
          {adding ? (
            <span className="inline-flex items-center gap-1">
              <Input
                autoFocus
                type="text"
                className="h-8 w-32 rounded-full"
                placeholder={t("guests.add.dietary_custom_placeholder")}
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
                aria-label={t("guests.add.dietary_confirm")}
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
              disabled={atLimit}
              onClick={() => setAdding(true)}
            >
              <PlusIcon className="size-4" />
              {t("guests.add.dietary_custom")}
            </Button>
          )}
        </FieldContent>
      </Field>
      <GuestAgeGroupField
        value={value.ageGroup}
        onChange={(ageGroup) => onChange({ ...value, ageGroup })}
      />
      <Field>
        <FieldLabel>{t("guests.add.note")}</FieldLabel>
        <FieldContent>
          <Input
            placeholder={t("guests.add.note_placeholder")}
            type="text"
            className="w-full rounded-md border"
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        </FieldContent>
      </Field>
    </>
  )
}
