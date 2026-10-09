import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ChevronRightIcon, LayoutTemplateIcon, PlusIcon } from "lucide-react"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { useStaffTenant } from "@/hooks/useStaffTenant"
import { isLocalWedding } from "@/lib/localWedding"

// The halls overview: one row per hall (name/floor/size + entity counts),
// tapping a row opens that hall's settings, plus the "add hall" entry point.
// New halls are placed automatically in a two-per-row layout
// (nextHallPosition) and can then be dragged into place on the canvas.
export const HallsPanelContent = () => {
  const { t } = useTranslation()

  const { halls, tables, fixtures, addHall } = usePlannerStore(
    useShallow((state) => ({
      halls: state.halls,
      tables: state.tables,
      fixtures: state.fixtures,
      addHall: state.addHall,
    }))
  )
  const openHallEdit = usePanelStore((state) => state.openHallEdit)
  const canEdit = useGlobalStore(selectCanEdit)
  const { weddingId, venue } = useGlobalStore(
    useShallow((state) => ({ weddingId: state.weddingId, venue: state.venue }))
  )
  const openDialog = useDialogStore((state) => state.open)
  const staffTenant = useStaffTenant()

  // Venue layouts: a linked couple starts from one, venue staff save one. The
  // two halves of LayoutPresetsDialog, so the button shows for either.
  const canPickPreset = !!venue && !!weddingId && !isLocalWedding(weddingId)
  const showPresets = canEdit && (canPickPreset || !!staffTenant)

  const entityCount = (hallId: string) =>
    tables.filter((t2) => t2.hallId === hallId).length +
    fixtures.filter((f) => f.hallId === hallId).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{t("hall.list_hint")}</p>

      <div className="flex flex-col gap-2">
        {halls.map((hall, index) => (
          <button
            key={hall.id}
            type="button"
            className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left hover:bg-muted/50"
            onClick={() => openHallEdit(hall.id)}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {hall.name.trim() ||
                  t("hall.unnamed_index", { index: index + 1 })}
                {hall.floor != null && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {t("hall.floor_short", { floor: hall.floor })}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {hall.size.width}×{hall.size.height} m ·{" "}
                {t("hall.entity_count", { count: entityCount(hall.id) })}
              </div>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Hidden rather than left to the disabled fieldset in PanelBody: an
          add button is an offer, and greying one out just advertises something
          a viewer can't have. Disabled edit *fields* still read as data. */}
      {canEdit && (
        <Button
          variant="outline"
          onClick={() => openHallEdit(addHall(DEFAULT_HALL))}
        >
          <PlusIcon />
          {t("hall.add")}
        </Button>
      )}

      {showPresets && (
        <Button
          variant="outline"
          onClick={() => openDialog("Planner.LayoutPresets")}
        >
          <LayoutTemplateIcon />
          {canPickPreset
            ? t("layout_presets.open_pick", { venue: venue.name })
            : t("layout_presets.open_save")}
        </Button>
      )}
    </div>
  )
}
