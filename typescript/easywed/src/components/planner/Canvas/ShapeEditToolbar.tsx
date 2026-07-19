import { useTranslation } from "react-i18next"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePanelStore } from "@/stores/panel.store"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * Floating pill shown while the ShapeEditOverlay owns the canvas: a short
 * how-to hint plus the Done button that returns to the entity's edit form
 * (or just leaves the mode when the entity vanished mid-edit).
 */
export const ShapeEditToolbar = () => {
  const { t } = useTranslation()
  const view = usePanelStore((s) =>
    s.view?.kind === "shape.edit" ? s.view : null
  )
  const openFixtureEdit = usePanelStore((s) => s.openFixtureEdit)
  const openHallEdit = usePanelStore((s) => s.openHallEdit)
  const close = usePanelStore((s) => s.close)
  const entityExists = usePlannerStore((s) =>
    view
      ? view.entityKind === "hall"
        ? s.halls.some((h) => h.id === view.id)
        : s.fixtures.some((f) => f.id === view.id)
      : false
  )

  if (!view) return null

  return (
    <div
      data-no-pan
      className="absolute top-3 left-1/2 z-30 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-3 rounded-full border bg-card/95 py-1.5 pr-1.5 pl-4 shadow-md backdrop-blur-sm"
    >
      <span className="hidden truncate text-xs text-muted-foreground sm:inline">
        {t("shape_edit.hint")}
      </span>
      <span className="truncate text-xs text-muted-foreground sm:hidden">
        {t("shape_edit.hint_short")}
      </span>
      <Button
        size="sm"
        className="rounded-full"
        onClick={() => {
          if (!entityExists) close()
          else if (view.entityKind === "hall") openHallEdit(view.id)
          else openFixtureEdit(view.id)
        }}
      >
        <CheckIcon className="size-4" />
        {t("common.done")}
      </Button>
    </div>
  )
}
