import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { GuestListContent } from "../Guests/GuestListContent"
import { RemindersPanelContent } from "../../reminders/RemindersPanelContent"
import { EntityListContent } from "./EntityListContent"
import { TabBadgeIcon } from "./TabBadgeIcon"
import { useTabBadgeCounts } from "./tabs"
import type { MobileListTab } from "@/stores/entityList.store"
import { useEntityListStore } from "@/stores/entityList.store"
import { usePanelStore } from "@/stores/panel.store"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const TABS: Array<MobileListTab> = ["guests", "tables", "fixtures", "reminders"]

/**
 * Mobile counterpart of the desktop `Sidebar/SidebarRail`: a fixed bottom bar
 * with Guests / Tables / Fixtures buttons (replacing the old guests-only
 * peek bar). Tapping one opens a drawer with that entity list; a
 * segmented header inside the drawer switches between them without closing.
 * Opening an edit form / add hub / AI chat (which surface via
 * `MobilePanelDrawer`) supersedes the list, so this one steps aside.
 */
export const MobileTabBar = () => {
  const { t } = useTranslation()
  const { isOpen, activeTab, openTab, close } = useEntityListStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      activeTab: state.activeTab,
      openTab: state.openTab,
      close: state.close,
    }))
  )
  // `ai_chat` is desktop-only; if the shared store still points at it (e.g.
  // after a desktop → mobile resize) fall back to the default list tab.
  const listTab: MobileListTab = activeTab === "ai_chat" ? "guests" : activeTab
  // When a panel view opens (tapping a list row → edit form, the add hub, the
  // AI chat), it renders in `MobilePanelDrawer` — close this list drawer
  // so the two don't stack.
  const panelView = usePanelStore((state) => state.view)
  useEffect(() => {
    if (panelView) close()
  }, [panelView, close])

  const badgeCount = useTabBadgeCounts()

  const tabLabel = (tab: MobileListTab) =>
    tab === "reminders" ? t("reminders.title") : t(tab)

  const listContent: Record<MobileListTab, React.ReactNode> = {
    guests: <GuestListContent />,
    tables: <EntityListContent kind="tables" />,
    fixtures: <EntityListContent kind="fixtures" />,
    reminders: <RemindersPanelContent />,
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 rounded-t-3xl border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_30px_-22px_rgba(40,60,45,0.4)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => openTab(tab)}
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground"
          >
            <TabBadgeIcon tab={tab} badgeCount={badgeCount[tab]} />
            <span className="max-w-full truncate px-0.5 text-[11px] font-semibold">
              {tabLabel(tab)}
            </span>
          </button>
        ))}
      </nav>

      <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
        <DrawerContent
          aria-describedby={undefined}
          className="max-h-[88dvh] gap-0"
        >
          <DrawerTitle className="sr-only">{tabLabel(listTab)}</DrawerTitle>
          <div className="grid grid-cols-4 gap-2 px-4 pt-4 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => openTab(tab)}
                className={cn(
                  "truncate rounded-full px-2 py-2 text-sm font-semibold transition-colors",
                  listTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {listContent[listTab]}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
