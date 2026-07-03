import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { PlusIcon, UtensilsIcon } from "lucide-react"
import { AddEntityDialog } from "./AddEntityDialog"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"

/**
 * Sidebar "Stoły" tab: add button + a flat row per table (no search — table
 * counts stay small compared to guests). Tapping a row opens the table's edit
 * dialog; the add button opens the preset picker pre-filtered to tables.
 */
export const TableListContent = () => {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  const { tables, guests, preset } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      guests: state.guests,
      preset: state.hall.preset,
    }))
  )
  const openTableEdit = usePanelStore((state) => state.openTableEdit)

  const assignedByTable = useMemo(() => {
    const counts = new Map<string, number>()
    for (const guest of guests) {
      if (!guest.tableId) continue
      counts.set(guest.tableId, (counts.get(guest.tableId) ?? 0) + 1)
    }
    return counts
  }, [guests])

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        disabled={!preset}
        onClick={() => setAddOpen(true)}
      >
        <PlusIcon />
        {t("tables.add")}
      </Button>

      {tables.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tables.none")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tables.map((table, index) => (
            <button
              key={table.id}
              type="button"
              onClick={() => openTableEdit(table.id)}
              className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-accent/50"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UtensilsIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {table.name.trim() ||
                    t("tables.unnamed_index", { index: index + 1 })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("tables.seats_ratio", {
                    assigned: assignedByTable.get(table.id) ?? 0,
                    count: table.capacity,
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddEntityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialCategory="tables"
      />
    </div>
  )
}
