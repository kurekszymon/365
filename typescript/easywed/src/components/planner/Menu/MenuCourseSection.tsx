import { useTranslation } from "react-i18next"
import { CheckIcon } from "lucide-react"

import type { MenuCourse, MenuOption } from "@/lib/menu"
import { courseIsComplete, dishLabel, isLive } from "@/lib/menu"
import { TagBadge } from "@/components/ui/tag-badge"
import { cn } from "@/lib/utils"

/**
 * One course, and the dishes the couple picks from it.
 *
 * `choose_count` is rendered as a sentence the client builds from the number -
 * "(do wyboru 5 pozycji)" - because the venue types a number, not a sentence.
 * That is what makes the Polish `_one`/`_few`/`_many` forms load-bearing here
 * and not in `serving_note`, which is free text shown verbatim.
 *
 * Nothing stops a couple picking more than `choose_count`. The database
 * deliberately does not enforce it (20260822000002 says why: it would refuse
 * the transient state of swapping one dish for another), so this counts and
 * says where they are rather than blocking - "4 z 5 wybranych", and the badge
 * clears once the count is met.
 *
 * `options` is `pickableOptions`, so a row here can be an archived dish this
 * wedding had already selected. It is dimmed and labelled rather than hidden -
 * the same treatment `CrmMenuPackageList` gives an archived package - because
 * hiding it would leave a dish in the served set with nothing on screen to
 * unpick it with. Unpicking is all it is still good for; it drops out of
 * `pickableOptions` on that same click.
 */
export const MenuCourseSection = ({
  course,
  options,
  selectedIds,
  canEdit,
  onToggle,
}: {
  course: MenuCourse
  options: Array<MenuOption>
  selectedIds: ReadonlySet<string>
  canEdit: boolean
  onToggle: (optionId: string) => void
}) => {
  const { t } = useTranslation()

  const picked = options.filter((option) => selectedIds.has(option.id)).length
  const complete = courseIsComplete(course, picked)

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-heading text-base font-semibold">{course.name}</h3>
        {course.per_guest_choice ? (
          <TagBadge tone="violet">{t("menu.per_guest_badge")}</TagBadge>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("menu.choose_count", { count: course.choose_count })}
        {/* Venue-authored text, interpolated and never used as a key. */}
        {course.serving_note ? ` · ${course.serving_note}` : null}
      </p>

      <p
        className={cn(
          "text-xs font-medium",
          complete ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {t("menu.picked_of", { count: picked, total: course.choose_count })}
      </p>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("menu.no_dishes")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {options.map((option) => {
            const isPicked = selectedIds.has(option.id)
            const retired = !isLive(option)

            return (
              <li key={option.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  aria-pressed={isPicked}
                  onClick={() => onToggle(option.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm",
                    isPicked && "border-primary bg-accent/40",
                    retired && "opacity-60",
                    canEdit
                      ? "cursor-pointer hover:bg-accent/50"
                      : "cursor-default opacity-90"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      isPicked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {isPicked ? <CheckIcon className="size-3" /> : null}
                  </span>
                  <span className="min-w-0">
                    {dishLabel(option)}
                    {option.note ? (
                      <span className="text-muted-foreground">
                        {" "}
                        {option.note}
                      </span>
                    ) : null}
                    {retired ? (
                      <span className="block text-xs text-muted-foreground">
                        {t("menu.archived_dish")}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
