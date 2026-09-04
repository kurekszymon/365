import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { TagBadge } from "@/components/ui/tag-badge"
import { dishNameIndex, menuOptionTone, tallyByOption } from "@/lib/menu"
import { useMenuStore } from "@/stores/menu.store"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * How many portions of each dish, for the kitchen.
 *
 * The question the whole menu feature exists to answer, and until now the CRM
 * could only approximate it from dietary tags.
 *
 * Counted from the pseudonymous guests `loadWeddingForVenue` already put in
 * `planner.store`, so there is no second query and **nothing here can reach a
 * name** - those rows never carried one. The same docblock `VenuePeekSummary`
 * has, and for the same reason: this component sits one careless `select` away
 * from being the place a guest name enters the CRM, so the fact that it makes
 * no query at all is the property worth stating.
 *
 * The dish *names* come from `menu.store`, which holds this venue's own
 * catalogue - written by these staff, and read unfiltered by `archived_at` so a
 * dish retired after the couple ordered it is still named here rather than
 * silently dropping off the count.
 *
 * Grouped by course, because a package can carry more than one per-guest course
 * even though today's schema assigns one dish per guest: the grouping is what
 * makes the report readable when it does.
 */
export const KitchenMenuTally = () => {
  const { t } = useTranslation()

  const guests = usePlannerStore((s) => s.guests)
  const options = useMenuStore((s) => s.options)
  const courses = useMenuStore((s) => s.courses)

  const dishNameById = useMemo(() => dishNameIndex(options), [options])
  const courseNameByOption = useMemo(() => {
    const courseName = new Map(
      courses.map((course) => [course.id, course.name])
    )
    return new Map(
      options.map((option) => [
        option.id,
        courseName.get(option.menu_course_id) ?? "",
      ])
    )
  }, [options, courses])

  const tally = useMemo(
    () =>
      tallyByOption(
        guests.map((g) => g.menuOptionId),
        (id) => dishNameById.get(id)
      ),
    [guests, dishNameById]
  )

  // Nothing ordered per guest: a buffet package, or a couple who has not
  // assigned dishes yet. Rendering an empty box would read as a fault.
  //
  // `unnamed` counts too: portions nobody can name are still portions, and a
  // kitchen that sees nothing here would cook nothing for them.
  if (tally.rows.length === 0 && tally.unnamed === 0) return null

  const assigned = guests.filter((g) => g.menuOptionId).length

  const byCourse = new Map<string, typeof tally.rows>()
  for (const row of tally.rows) {
    const course = courseNameByOption.get(row.id) ?? ""
    byCourse.set(course, [...(byCourse.get(course) ?? []), row])
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("crm.wedding.dishes_title")}</p>
      <p className="text-sm text-muted-foreground">
        {t("crm.wedding.dishes_assigned", {
          count: assigned,
          total: guests.length,
        })}
      </p>

      {[...byCourse.entries()].map(([course, rows]) => (
        <div key={course} className="flex flex-col gap-1">
          {course ? (
            <p className="text-xs font-medium text-muted-foreground">
              {course}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {rows.map((dish) => (
              <TagBadge key={dish.id} tone={menuOptionTone(dish.name)}>
                {dish.name} · {dish.count}
              </TagBadge>
            ))}
          </div>
        </div>
      ))}

      {/* Portions this venue's own catalogue could not name - a dish deleted
          rather than archived, out from under an assignment. Shown rather than
          dropped, because the line above counts them and the kitchen has to
          cook them. */}
      {tally.unnamed > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("crm.wedding.dishes_unnamed", { count: tally.unnamed })}
        </p>
      ) : null}
    </div>
  )
}
