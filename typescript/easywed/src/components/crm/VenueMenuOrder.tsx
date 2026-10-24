import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"

import { servedByCourse } from "@/lib/menu"
import { useMenuStore } from "@/stores/menu.store"

/**
 * The couple's order as they placed it: the package, and the dishes picked in
 * each of its courses.
 *
 * Read from `menu.store`, which `loadWeddingForVenue` filled with the package id,
 * the served set and the venue's own catalogue - every value a uuid of that
 * catalogue, so there is no query here and no guest data within reach.
 */
export const VenueMenuOrder = () => {
  const { t } = useTranslation()

  const { packageId, packages, courses, options, selectedOptionIds } =
    useMenuStore(
      useShallow((s) => ({
        packageId: s.packageId,
        packages: s.packages,
        courses: s.courses,
        options: s.options,
        selectedOptionIds: s.selectedOptionIds,
      }))
    )

  // Unfiltered by `archived_at`, so a package retired after the couple ordered
  // it still reads.
  const chosenPackage = packages.find((p) => p.id === packageId)

  const order = useMemo(
    () =>
      packageId
        ? servedByCourse(packageId, courses, options, selectedOptionIds)
        : [],
    [packageId, courses, options, selectedOptionIds]
  )

  if (packageId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("crm.wedding.package_none")}
      </p>
    )
  }

  // A package id with no name yet is the catalogue still in flight.
  if (!chosenPackage) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("crm.wedding.package_title")}</p>
      <p className="text-sm">{chosenPackage.name}</p>
      {order.length > 0 ? (
        <dl className="flex flex-col gap-1 text-sm">
          {order.map(({ course, dishes }) => (
            <div key={course.id} className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">{course.name}:</dt>
              <dd>
                {dishes.length > 0
                  ? dishes.map((dish) => dish.name).join(", ")
                  : t("crm.wedding.course_empty")}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
