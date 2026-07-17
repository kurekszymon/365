import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { LayoutPanelLeftIcon, PlusIcon, UtensilsIcon } from "lucide-react"
import { AddEntityDialog } from "./AddEntityDialog"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"

type EntityListContentProps = {
  kind: "tables" | "fixtures"
}

/**
 * Sidebar "Stoły" / "Elementy sali" tab: add button (preset picker
 * pre-filtered to the launching kind) + a flat row per entity - no search,
 * these counts stay small compared to guests. Tapping a row opens the
 * entity's edit dialog. Tables show an assigned/capacity subtitle; unnamed
 * fixtures fall back to their shape label.
 */
export const EntityListContent = ({ kind }: EntityListContentProps) => {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  const { tables, fixtures, guests, preset } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      fixtures: state.fixtures,
      guests: state.guests,
      preset: state.hall.preset,
    }))
  )
  const openTableEdit = usePanelStore((state) => state.openTableEdit)
  const openFixtureEdit = usePanelStore((state) => state.openFixtureEdit)

  const assignedByTable = useMemo(() => {
    if (kind !== "tables") return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const guest of guests) {
      if (!guest.tableId) continue
      counts.set(guest.tableId, (counts.get(guest.tableId) ?? 0) + 1)
    }
    return counts
  }, [kind, guests])

  const isTables = kind === "tables"
  const Icon = isTables ? UtensilsIcon : LayoutPanelLeftIcon
  const rows = isTables
    ? tables.map((table, index) => ({
        id: table.id,
        name:
          table.name.trim() || t("tables.unnamed_index", { index: index + 1 }),
        subtitle: t("tables.seats_ratio", {
          assigned: assignedByTable.get(table.id) ?? 0,
          count: table.capacity,
        }),
        onOpen: () => openTableEdit(table.id),
      }))
    : fixtures.map((fixture) => ({
        id: fixture.id,
        name: fixture.name.trim() || t(`fixtures.shape.${fixture.shape}`),
        subtitle: null,
        onOpen: () => openFixtureEdit(fixture.id),
      }))

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        disabled={!preset}
        onClick={() => setAddOpen(true)}
      >
        <PlusIcon />
        {t(isTables ? "tables.add" : "fixtures.add")}
      </Button>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(isTables ? "tables.none" : "fixtures.none")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={row.onOpen}
              className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-accent/50"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                {row.subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.subtitle}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <AddEntityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialCategory={kind}
      />
    </div>
  )
}
