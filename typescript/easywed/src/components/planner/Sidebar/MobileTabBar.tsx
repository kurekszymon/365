import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { GuestListContent } from "../Guests/GuestListContent"
import { MenuPanelContent } from "../Menu/MenuPanelContent"
import { RemindersPanelContent } from "../../reminders/RemindersPanelContent"
import { EntityListContent } from "./EntityListContent"
import { TabBadgeIcon } from "./TabBadgeIcon"
import { useTabBadgeCounts } from "./tabs"
import type { MobileListTab } from "@/stores/entityList.store"
import { useEntityListStore } from "@/stores/entityList.store"
import { usePanelStore } from "@/stores/panel.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const TABS: Array<MobileListTab> = [
  "guests",
  "tables",
  "fixtures",
  "reminders",
  // Only for a wedding linked to a venue - see `visibleTabs` below, and
  // `tabsFor` in SidebarRail for the same rule on desktop.
  "menu",
]

/**
 * Column counts, spelled out rather than interpolated: Tailwind v4's scanner
 * only sees class names written verbatim, so `` `grid-cols-${n}` `` compiles to
 * nothing - the same reason TAG_TONE_BADGE and the theme SWATCH are literal maps.
 */
const GRID_COLS: Record<number, string> = {
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
}

/**
 * Mobile counterpart of the desktop `Sidebar/SidebarRail`: a fixed bottom bar
 * whose buttons open a drawer with that entity list, switchable from a segmented
 * header inside the drawer. Anything surfacing via `MobilePanelDrawer` - an edit
 * form, the add hub, the AI chat - supersedes the list, so this steps aside.
 *
 * The assistant sits here too, mirroring the desktop rail's "Asystent" tab. It
 * is not an entity list, so it opens the panel drawer directly rather than going
 * through `entityList.store`.
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
  // A wedding linked to no venue has no menu, so it gets no Menu tab - which
  // covers guest mode for free, since a local wedding has no tenant.
  const hasVenue = useGlobalStore((state) => state.venue !== null)
  const visibleTabs = TABS.filter((tab) => hasVenue || tab !== "menu")

  // `ai_chat` is desktop-only, and `menu` can disappear under a wedding that is
  // unlinked; if the shared store still points at either (e.g. after a desktop
  // → mobile resize, or navigating to a wedding with no venue) fall back to the
  // default list tab.
  const listTab: MobileListTab =
    activeTab === "ai_chat" || !visibleTabs.includes(activeTab)
      ? "guests"
      : activeTab
  // When a panel view opens (tapping a list row → edit form, the add hub, the
  // AI chat), it renders in `MobilePanelDrawer` - close this list drawer
  // so the two don't stack.
  const panelView = usePanelStore((state) => state.view)
  useEffect(() => {
    if (panelView) close()
  }, [panelView, close])

  const openAiChat = usePanelStore((state) => state.openAiChat)
  // Every assistant tool is a write, so a viewer gets no assistant tab - same
  // rule as the desktop rail.
  const canEdit = useGlobalStore(selectCanEdit)

  const badgeCount = useTabBadgeCounts()

  const tabLabel = (tab: MobileListTab) => {
    if (tab === "reminders") return t("reminders.title")
    if (tab === "menu") return t("menu.title")
    return t(tab)
  }

  const listContent: Record<MobileListTab, React.ReactNode> = {
    guests: <GuestListContent />,
    tables: <EntityListContent kind="tables" />,
    fixtures: <EntityListContent kind="fixtures" />,
    reminders: <RemindersPanelContent />,
    menu: <MenuPanelContent />,
  }

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 grid rounded-t-3xl border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_30px_-22px_rgba(40,60,45,0.4)]",
          GRID_COLS[visibleTabs.length + (canEdit ? 1 : 0)]
        )}
      >
        {visibleTabs.map((tab) => (
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
        {canEdit && (
          <button
            type="button"
            onClick={() => openAiChat()}
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground"
          >
            <TabBadgeIcon tab="ai_chat" badgeCount={0} />
            <span className="max-w-full truncate px-0.5 text-[11px] font-semibold">
              {t("assistant.title")}
            </span>
          </button>
        )}
      </nav>

      <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
        <DrawerContent
          aria-describedby={undefined}
          className="max-h-[88dvh] gap-0"
        >
          <DrawerTitle className="sr-only">{tabLabel(listTab)}</DrawerTitle>
          <div
            className={cn(
              "grid gap-2 px-4 pt-4 pb-4",
              GRID_COLS[visibleTabs.length]
            )}
          >
            {visibleTabs.map((tab) => (
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
