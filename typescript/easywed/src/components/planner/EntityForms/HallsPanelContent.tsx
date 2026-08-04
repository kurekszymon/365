import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ChevronRightIcon, PlusIcon } from "lucide-react"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"

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
    </div>
  )
}
