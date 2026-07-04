import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { GuestListContent } from "../GuestPanel/GuestListContent"
import { EntityListContent } from "./EntityListContent"
import { TabBadgeIcon } from "./TabBadgeIcon"
import { useTabBadgeCounts } from "./tabs"
import type { MobileListTab } from "@/stores/mobilePanel.store"
import { useMobilePanelStore } from "@/stores/mobilePanel.store"
import { usePanelStore } from "@/stores/panel.store"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const TABS: Array<MobileListTab> = ["guests", "tables", "fixtures"]

/**
 * Mobile counterpart of the desktop `Sidebar/SidebarRail`: a fixed bottom bar
 * with Guests / Tables / Fixtures buttons (replacing the old guests-only
 * peek bar). Tapping one opens a drawer with that entity list; a
 * segmented header inside the drawer switches between them without closing.
 * Opening an edit form / add hub / AI chat (which surface via
 * `PropertyPanel`'s own drawer) supersedes the list, so this one steps aside.
 */
export const MobileTabBar = () => {
  const { t } = useTranslation()
  const { activeTab, open, close } = useMobilePanelStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      open: state.open,
      close: state.close,
    }))
  )
  // When a panel view opens (tapping a list row → edit form, the add hub, the
  // AI chat), it renders in `PropertyPanel`'s drawer — close this list drawer
  // so the two don't stack.
  const panelView = usePanelStore((state) => state.view)
  useEffect(() => {
    if (panelView) close()
  }, [panelView, close])

  const badgeCount = useTabBadgeCounts()

  const listContent: Record<MobileListTab, React.ReactNode> = {
    guests: <GuestListContent />,
    tables: <EntityListContent kind="tables" />,
    fixtures: <EntityListContent kind="fixtures" />,
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 rounded-t-3xl border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_30px_-22px_rgba(40,60,45,0.4)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => open(tab)}
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground"
          >
            <TabBadgeIcon tab={tab} badgeCount={badgeCount[tab]} />
            <span className="text-[11px] font-semibold">{t(tab)}</span>
          </button>
        ))}
      </nav>

      <Drawer
        open={activeTab !== null}
        onOpenChange={(isOpen) => !isOpen && close()}
      >
        <DrawerContent
          aria-describedby={undefined}
          className="max-h-[88dvh] gap-0"
        >
          <DrawerTitle className="sr-only">
            {activeTab ? t(activeTab) : ""}
          </DrawerTitle>
          <div className="grid grid-cols-3 gap-2 px-4 pt-4 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => open(tab)}
                className={cn(
                  "rounded-full py-2 text-sm font-semibold transition-colors",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {t(tab)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {activeTab && listContent[activeTab]}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
