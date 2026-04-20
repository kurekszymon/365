import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import { HallPanelContent } from "./HallPanelContent"
import { TablePanelContent } from "./TablePanelContent"
import { TableBatchPanelContent } from "./TableBatchPanelContent"
import { GuestsPanelContent } from "./GuestsPanelContent"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function usePanelTitle(): string {
  const { t } = useTranslation()
  const view = usePanelStore((state) => state.view)
  if (!view) return ""
  switch (view.kind) {
    case "hall":
      return t("hall")
    case "table.add":
      return t("tables.add")
    case "tables.batch_add":
      return t("tables.add_batch")
    case "table.edit":
      return t("tables.edit")
    case "tables.placeholder":
      return t("tables")
    case "guests":
      return t("guests")
  }
}

export const PropertyPanel = () => {
  const { t } = useTranslation()
  const view = usePanelStore((state) => state.view)
  const close = usePanelStore((state) => state.close)
  const openTableAdd = usePanelStore((state) => state.openTableAdd)
  const openTablesBatchAdd = usePanelStore(
    (state) => state.openTablesBatchAdd
  )
  const title = usePanelTitle()

  const isOpen = view !== null

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-l bg-background transition-all duration-200",
        isOpen ? "w-80" : "w-0 overflow-hidden border-l-0"
      )}
    >
      {isOpen && (
        <>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-medium">{title}</span>
            <button
              type="button"
              onClick={close}
              className="rounded-sm text-muted-foreground hover:text-foreground"
              aria-label={t("common.close")}
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {view.kind === "hall" && <HallPanelContent />}
            {view.kind === "table.add" && (
              <TablePanelContent
                key="table.add"
                mode="add"
                position={view.position}
              />
            )}
            {view.kind === "tables.batch_add" && (
              <TableBatchPanelContent
                key="tables.batch_add"
                position={view.position}
              />
            )}
            {view.kind === "table.edit" && (
              <TablePanelContent
                key={`table.edit.${view.tableId}`}
                mode="edit"
                tableId={view.tableId}
              />
            )}
            {view.kind === "tables.placeholder" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {t("tables.select_to_edit")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => openTableAdd()}>
                    {t("tables.add")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openTablesBatchAdd()}
                  >
                    {t("tables.add_batch")}
                  </Button>
                </div>
              </div>
            )}
            {view.kind === "guests" && <GuestsPanelContent />}
          </div>
        </>
      )}
    </div>
  )
}
