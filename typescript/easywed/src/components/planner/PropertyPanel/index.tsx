import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import { PanelBody } from "./PanelBody"
import { usePanelTitle } from "./usePanelTitle"
import { usePanelStore } from "@/stores/panel.store"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

/**
 * Mobile-only bottom drawer for the panel views (table/fixture/hall forms,
 * the add hub, the AI chat). On desktop the same views render in
 * `Sidebar/EntityEditDialog` / `Sidebar/SidebarRail` instead — this component
 * is only mounted below the `md` breakpoint (see `Planner.tsx`).
 */
export const PropertyPanel = () => {
  const { t } = useTranslation()
  const view = usePanelStore((state) => state.view)
  const close = usePanelStore((state) => state.close)
  const title = usePanelTitle(view)

  const isOpen = view !== null
  // The AI chat owns its own vertical layout (scrolling transcript + pinned
  // composer) and wants more room, so it opts out of the default padded,
  // auto-scrolling content wrapper.
  const isChat = view?.kind === "ai_chat"
  const body = view ? <PanelBody view={view} /> : null

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle className="font-heading text-lg">{title}</DrawerTitle>
          <button
            type="button"
            onClick={close}
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label={t("common.close")}
          >
            <XIcon className="size-5" />
          </button>
        </DrawerHeader>
        {isChat ? (
          <div className="flex h-[70vh] flex-col pb-[env(safe-area-inset-bottom)]">
            {body}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {body}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
