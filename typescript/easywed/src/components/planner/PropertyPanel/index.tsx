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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    case "fixture.add":
      return t("fixtures.add")
    case "fixture.edit":
      return t("fixtures.edit")
    case "fixtures.placeholder":
      return t("fixtures")
    case "add_hub":
      return t("hall.add_hub.title")
    case "ai_chat":
      return t("assistant.title")
  }
}

export const PropertyPanel = () => {
  const { t } = useTranslation()
  const view = usePanelStore((state) => state.view)
  const close = usePanelStore((state) => state.close)
  const openAddHub = usePanelStore((state) => state.openAddHub)
  const openAiChat = usePanelStore((state) => state.openAiChat)
  const title = usePanelTitle(view)
  const isMobile = useIsMobile()

  const isOpen = view !== null
  // The AI chat owns its own vertical layout (scrolling transcript + pinned
  // composer) and wants more room, so it opts out of the default padded,
  // auto-scrolling content wrapper and uses a wider sidebar.
  const isChat = view?.kind === "ai_chat"
  // On desktop, "Dodaj" and "Asystent AI" are siblings of one hub panel
  // switched via tabs (mirrors the mockup's permanent sidebar tabs); on mobile
  // they're reached separately (FAB / header sparkle icon) so no tabs there.
  const isHub = isChat || view?.kind === "add_hub"
  const body = view ? <PanelBody view={view} /> : null

  // On phones the side panel would crush the canvas, so render the same content
  // in a bottom sheet that overlays the canvas instead.
  if (isMobile) {
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

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-l bg-background transition-all duration-200",
        isOpen ? (isHub ? "w-96" : "w-80") : "w-0 overflow-hidden border-l-0"
      )}
    >
      {view && (
        <>
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            {isHub ? (
              <Tabs
                value={isChat ? "chat" : "add"}
                onValueChange={(v) =>
                  v === "chat" ? openAiChat() : openAddHub()
                }
                className="flex-1"
              >
                <TabsList className="w-full">
                  <TabsTrigger value="add">
                    {t("hall.add_hub.title")}
                  </TabsTrigger>
                  <TabsTrigger value="chat">{t("assistant.title")}</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <span className="font-heading text-base font-semibold">
                {title}
              </span>
            )}
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
              aria-label={t("common.close")}
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {isChat ? (
            <div className="flex min-h-0 flex-1 flex-col">{body}</div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">{body}</div>
          )}
        </>
      )}
    </div>
  )
}
