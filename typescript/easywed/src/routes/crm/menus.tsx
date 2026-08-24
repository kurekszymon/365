import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon } from "lucide-react"

import { CrmMenuPackageEditor } from "@/components/crm/CrmMenuPackageEditor"
import { CrmMenuPackageList } from "@/components/crm/CrmMenuPackageList"
import { useTenantMenus } from "@/components/crm/useTenantMenus"
import { Button } from "@/components/ui/button"
import { useTenantStore } from "@/stores/tenant.store"

/**
 * The venue's menu catalogue: packages, their courses, and the dishes each
 * course offers.
 *
 * This is the screen the whole of phase 4 hangs off. What the venue writes here
 * is what a linked couple picks from in the planner, and what the kitchen report
 * eventually tallies - so the data model, not the layout, is where the thought
 * went (see 20260822000001).
 *
 * No guard of its own: /crm's layout has already decided the caller is staff of
 * a resolved, active tenant before this renders - the same arrangement
 * crm/roster.tsx uses.
 *
 * Nothing on this screen shows a total. A package carries a per-person price
 * and that is the honest number available today; extras and the age-tier
 * multipliers land with bookings, and a total computed without them would be a
 * quote that is wrong in the venue's favour or the couple's, unpredictably.
 */
export const Route = createFileRoute("/crm/menus")({
  component: CrmMenus,
})

function CrmMenus() {
  const { t } = useTranslation()
  const tenant = useTenantStore((s) => s.tenant)
  const menus = useTenantMenus(tenant?.id)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // The selection follows the data rather than being seeded by an effect: a
  // deleted package, or a first load that has not landed yet, both resolve to
  // "the first one there is" with no state to keep in step.
  //
  // `.at(0)` rather than `[0]`, for the reason `fetchPublicTenant` gives: the
  // index signature types as `T`, so `[0]` would make the empty-list guard below
  // read as dead code while being exactly what catches a venue with no menus.
  const selected =
    menus.packages.find((pkg) => pkg.id === selectedId) ?? menus.packages.at(0)

  const addPackage = async () => {
    const id = await menus.createPackage(t("crm.menus.new_package_name"))
    if (id) setSelectedId(id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">
          {t("crm.menus.title")}
        </h1>
        <p className="max-w-prose text-muted-foreground">
          {t("crm.menus.body")}
        </p>
      </div>

      {menus.error ? (
        <p className="text-sm text-destructive">{menus.error}</p>
      ) : null}

      {!menus.loaded ? (
        <p className="text-sm text-muted-foreground">{t("crm.loading")}</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-3 lg:w-72 lg:shrink-0">
            <CrmMenuPackageList
              packages={menus.packages}
              currency={menus.currency}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => void addPackage()}
            >
              <PlusIcon />
              {t("crm.menus.add_package")}
            </Button>
          </div>

          <div className="min-w-0 flex-1">
            {selected ? (
              <CrmMenuPackageEditor
                key={selected.id}
                pkg={selected}
                menus={menus}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
