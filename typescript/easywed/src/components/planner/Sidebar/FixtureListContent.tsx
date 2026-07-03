import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { LayoutPanelLeftIcon, PlusIcon } from "lucide-react"
import { AddEntityDialog } from "./AddEntityDialog"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"

/**
 * Sidebar "Elementy sali" tab — same shape as `TableListContent`: add button
 * (preset picker pre-filtered to fixtures) + a flat row per fixture, tap to
 * open its edit dialog. Unnamed fixtures fall back to their shape label.
 */
export const FixtureListContent = () => {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  const { fixtures, preset } = usePlannerStore(
    useShallow((state) => ({
      fixtures: state.fixtures,
      preset: state.hall.preset,
    }))
  )
  const openFixtureEdit = usePanelStore((state) => state.openFixtureEdit)

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        disabled={!preset}
        onClick={() => setAddOpen(true)}
      >
        <PlusIcon />
        {t("fixtures.add")}
      </Button>

      {fixtures.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("fixtures.none")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {fixtures.map((fixture) => (
            <button
              key={fixture.id}
              type="button"
              onClick={() => openFixtureEdit(fixture.id)}
              className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-accent/50"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LayoutPanelLeftIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {fixture.name.trim() || t(`fixtures.shape.${fixture.shape}`)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddEntityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialCategory="fixtures"
      />
    </div>
  )
}
