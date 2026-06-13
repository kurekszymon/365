import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import { PanelBody } from "./PanelBody"
import type { PanelView } from "@/stores/panel.store"
import { usePanelStore } from "@/stores/panel.store"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

function usePanelTitle(view: PanelView | null): string {
  const { t } = useTranslation()
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
    case "fixture.add":
      return t("fixtures.add")
    case "fixture.edit":
      return t("fixtures.edit")
    case "fixtures.placeholder":
      return t("fixtures")
  }
}

export const PropertyPanel = () => {
  const { t } = useTranslation()
  const view = usePanelStore((state) => state.view)
  const close = usePanelStore((state) => state.close)
  const title = usePanelTitle(view)
  const isMobile = useIsMobile()

  const isOpen = view !== null

  // On phones the side panel would crush the canvas, so render the same content
  // in a bottom sheet that overlays the canvas instead.
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
        <DrawerContent>
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>{title}</DrawerTitle>
            <button
              type="button"
              onClick={close}
              className="rounded-sm text-muted-foreground hover:text-foreground"
              aria-label={t("common.close")}
            >
              <XIcon className="size-5" />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {view && <PanelBody view={view} />}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-l bg-background transition-all duration-200",
        isOpen ? "w-80" : "w-0 overflow-hidden border-l-0"
      )}
    >
      {view && (
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
            <PanelBody view={view} />
          </div>
        </>
      )}
    </div>
  )
}
