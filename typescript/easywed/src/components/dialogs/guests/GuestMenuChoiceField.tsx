import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"

import { dishLabel, menuOptionTone, optionsOf } from "@/lib/menu"
import { track } from "@/lib/analytics/track"
import { TAG_TONE_BADGE, TAG_TONE_SOLID } from "@/lib/tagTone"
import { cn } from "@/lib/utils"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { liveCourses, useMenuStore } from "@/stores/menu.store"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * Which dish this guest is having.
 *
 * The shape of `GuestAgeGroupField`'s single-select pill row, except the options
 * are the intersection of the venue's per-guest course and the dishes the couple
 * picked - so a guest can only be assigned something the kitchen agreed to cook,
 * which `enforce_guest_menu_option` also enforces server-side.
 *
 * Writes straight through `setGuestMenuOption` rather than into the form draft:
 * the dish is not part of `GuestFormValues`, and folding it in would let this
 * dialog overwrite a choice made on the Menu tab or another device with a stale
 * null on save. Same reasoning as `updateGuestSeat`, and why the field only
 * appears for a guest who already exists.
 *
 * Renders nothing when the package has no per-guest course - every buffet menu,
 * every unlinked wedding, and all of guest mode.
 */
export const GuestMenuChoiceField = ({ guestId }: { guestId: string }) => {
  const { t } = useTranslation()
  const canEdit = useGlobalStore(selectCanEdit)

  const menu = useMenuStore((state) => state)
  const { guest, setGuestMenuOption } = usePlannerStore(
    useShallow((state) => ({
      guest: state.guests.find((g) => g.id === guestId) ?? null,
      setGuestMenuOption: state.setGuestMenuOption,
    }))
  )

  const selected = new Set(menu.selectedOptionIds)

  // One course, not all of them: a second plated course would need a dish per
  // course per guest, and `guests.menu_option_id` is a single column. Taking the
  // first keeps this honest about what the schema can hold.
  const course = liveCourses(menu).find((c) => c.per_guest_choice)
  if (!course || !guest) return null

  // Selection, and deliberately **not** `isLive` on top of it. A dish archived
  // after this wedding ordered it is still being cooked, and the database agrees:
  // `enforce_guest_menu_option` passes `menu_option_in_package`'s default
  // `_require_active => false`, where a new *selection* passes `true`
  // (20260822000002). Filtering archived dishes out would freeze guest edits on
  // a wedding whose main the venue retired for next season.
  const options = optionsOf(menu.options, course.id).filter((option) =>
    selected.has(option.id)
  )
  if (options.length === 0) return null

  return (
    <Field>
      <FieldLabel>{t("guests.add.dish", { course: course.name })}</FieldLabel>
      <FieldContent className="flex-row flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = guest.menuOptionId === option.id
          const tone = menuOptionTone(option.name)

          return (
            <Button
              key={option.id}
              variant="outline"
              disabled={!canEdit}
              aria-pressed={isSelected}
              className={cn(
                "rounded-full",
                isSelected ? TAG_TONE_SOLID[tone] : TAG_TONE_BADGE[tone]
              )}
              onClick={() => {
                // Clicking the chosen dish again clears it - the same toggle
                // the dietary and age-group rows use, and the only way back to
                // "not decided yet" without a separate button.
                setGuestMenuOption(guestId, isSelected ? null : option.id)
                if (!isSelected) {
                  track("menu_guest_dish_assigned", { source: "guest_list" })
                }
              }}
            >
              {dishLabel(option)}
            </Button>
          )
        })}
      </FieldContent>
    </Field>
  )
}
