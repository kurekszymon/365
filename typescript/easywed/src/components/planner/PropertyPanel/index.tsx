import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import { HallPanelContent } from "./HallPanelContent"
import { TablePanelContent } from "./TablePanelContent"
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
              <TablePanelContent mode="add" position={view.position} />
            )}
            {view.kind === "table.edit" && (
              <TablePanelContent mode="edit" tableId={view.tableId} />
            )}
            {view.kind === "tables.placeholder" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {t("tables.select_to_edit")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => openTableAdd()}
                >
                  {t("tables.add")}
                </Button>
              </div>
            )}
            {view.kind === "guests" && <GuestsPanelContent />}
          </div>
        </>
      )}
    </div>
  )
}
