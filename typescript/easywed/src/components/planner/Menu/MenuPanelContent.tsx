import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { MenuCourseSection } from "./MenuCourseSection"
import { MenuPackagePicker } from "./MenuPackagePicker"
import { Button } from "@/components/ui/button"
import { isLive } from "@/lib/menu"
import { formatMoney } from "@/lib/money"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import {
  liveCourses,
  pickableOptions,
  selectOrderedPackage,
  useMenuStore,
} from "@/stores/menu.store"

/**
 * The Menu tab: which package this wedding ordered, and which dishes of it are
 * being served.
 *
 * Only reachable for a wedding linked to a venue - `tabsFor` in SidebarRail and
 * `visibleTabs` in MobileTabBar drop the tab otherwise, which covers guest mode
 * for free because a local wedding has no tenant.
 *
 * The spinner on a cold load is not a loading state anyone forgot to remove.
 * The catalogue needs `weddings.tenant_id`, which is only known once the
 * wedding row has come back, so it is necessarily a second round trip -
 * `loadWedding` fires it unawaited rather than making every wedding open pay
 * for it serially. See loadMenuCatalogue.
 *
 * Every write affordance is gated on `selectCanEdit`. A viewer reads the menu
 * the couple chose, the way they read the seating plan.
 */
export const MenuPanelContent = () => {
  const { t, i18n } = useTranslation()
  const canEdit = useGlobalStore(selectCanEdit)
  const venueName = useGlobalStore((state) => state.venue?.name ?? null)

  // The whole store, in one subscription. Every derived list below spans two or
  // three of its slices - a course's dishes need `options` *and*
  // `selectedOptionIds` - so slicing them apart would be four subscriptions
  // that always change together. The selectors are plain functions over state,
  // not hooks, so they are called rather than subscribed to.
  const menu = useMenuStore((state) => state)
  const { status, currency, packages } = menu

  const [confirming, setConfirming] = useState<string | null>(null)

  const orderedPackage = selectOrderedPackage(menu)
  const courses = liveCourses(menu)
  const selectedIds = useMemo(
    () => new Set(menu.selectedOptionIds),
    [menu.selectedOptionIds]
  )
  const livePackages = useMemo(() => packages.filter(isLive), [packages])

  if (status === "loading" || status === "idle") {
    return <p className="text-sm text-muted-foreground">{t("menu.loading")}</p>
  }

  if (status === "failed") {
    return <p className="text-sm text-destructive">{t("menu.load_failed")}</p>
  }

  // Choosing for the first time: no confirm, because there is nothing to lose.
  if (!orderedPackage) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t("menu.pick_package", { venue: venueName ?? "" })}
        </p>
        <MenuPackagePicker
          packages={livePackages}
          currency={currency}
          selectedId={null}
          canEdit={canEdit}
          onSelect={(id) => void menu.choosePackage(id)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold">
          {orderedPackage.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("menu.per_person", {
            price: formatMoney(
              orderedPackage.price_per_person_minor,
              currency,
              i18n.language
            ),
          })}
        </p>
        {orderedPackage.description ? (
          <p className="text-xs text-muted-foreground">
            {orderedPackage.description}
          </p>
        ) : null}
      </div>

      {canEdit ? (
        confirming === null ? (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setConfirming(orderedPackage.id)}
          >
            {t("menu.change_package")}
          </Button>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border p-3">
            {/* A data-losing click, so it says what it will lose and how much.
                The database wipes the selections in the same statement (the
                weddings_menu_package_changed trigger), because every option row
                belongs to exactly one package - "keep what still fits" would
                keep nothing. */}
            <p className="text-sm">
              {t("menu.change_warning", {
                count: menu.selectedOptionIds.length,
              })}
            </p>
            <MenuPackagePicker
              packages={livePackages}
              currency={currency}
              selectedId={orderedPackage.id}
              canEdit
              onSelect={(id) => {
                setConfirming(null)
                void menu.choosePackage(id)
              }}
            />
            <div className="flex flex-wrap items-center gap-2 self-start">
              {/* The way back out of a menu chosen by mistake, and the only
                  one: `link_wedding_to_venue` clears the package on a re-link,
                  but a couple who picked the wrong package at the right venue
                  has nothing to re-link. Same warning covers it - the database
                  wipes the selections for a clear exactly as it does for a
                  switch. */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirming(null)
                  void menu.choosePackage(null)
                }}
              >
                {t("menu.clear_package")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(null)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )
      ) : null}

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("menu.no_courses")}</p>
      ) : (
        courses.map((course) => (
          <MenuCourseSection
            key={course.id}
            course={course}
            options={pickableOptions(menu, course.id)}
            selectedIds={selectedIds}
            canEdit={canEdit}
            onToggle={(optionId) => menu.toggleOption(optionId)}
          />
        ))
      )}
    </div>
  )
}
