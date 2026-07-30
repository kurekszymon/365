import { useTranslation } from "react-i18next"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { GuestListContent } from "../Guests/GuestListContent"
import { AiChatPanelContent } from "../EntityForms/AiChatPanelContent"
import { RemindersPanelContent } from "../../reminders/RemindersPanelContent"
import { EntityListContent } from "./EntityListContent"
import { TabBadgeIcon } from "./TabBadgeIcon"
import { useTabBadgeCounts } from "./tabs"
import type { EntityListTab } from "@/stores/entityList.store"
import { useEntityListStore } from "@/stores/entityList.store"
import { cn } from "@/lib/utils"

const TAB_ORDER: Array<EntityListTab> = [
  "guests",
  "tables",
  "fixtures",
  "reminders",
  "ai_chat",
]

/**
 * Desktop-only unified sidebar: a ~60px icon strip - Guests / Tables /
 * Fixtures / Asystent AI - plus a content column that slides in over the
 * canvas as an overlay (see the return for why it overlays rather than
 * pushing). The strip stays visible while expanded so switching tabs never
 * requires collapsing first; clicking the active tab's icon toggles the panel
 * closed.
 */
export const SidebarRail = () => {
  const { t } = useTranslation()
  const { expanded, activeTab, openTab, close, toggle } = useEntityListStore(
    useShallow((state) => ({
      expanded: state.isOpen,
      activeTab: state.activeTab,
      openTab: state.openTab,
      close: state.close,
      toggle: state.toggle,
    }))
  )
  const badgeCount = useTabBadgeCounts()

  const tabLabel = (tab: EntityListTab) => {
    if (tab === "ai_chat") return t("assistant.title")
    if (tab === "reminders") return t("reminders.title")
    return t(tab)
  }

  // The AI chat owns its own vertical layout (scrolling transcript + pinned
  // composer), so it fills the column instead of using the padded,
  // auto-scrolling wrapper the list tabs get.
  const isChat = activeTab === "ai_chat"
  const content = {
    guests: <GuestListContent />,
    tables: <EntityListContent kind="tables" />,
    fixtures: <EntityListContent kind="fixtures" />,
    reminders: <RemindersPanelContent />,
    ai_chat: <AiChatPanelContent />,
  }[activeTab]

  return (
    // The rail's own footprint is always the 60px strip; the content column is
    // an absolutely-positioned overlay that slides in over the canvas by
    // animating `translate` (see the panel's transition below). Animating
    // `width` here instead would resize the flex-sibling canvas every frame -
    // whose ResizeObserver then recomputes hall geometry and re-renders the
    // whole surface per frame, which is what made expanding feel sluggish. A
    // translate only composites; the canvas never relayouts.
    <div className="relative z-30 flex w-[60px] shrink-0 border-r bg-background">
      {/* Opaque and stacked above the panel so the panel slides out from
          *under* the strip instead of gliding across the icons. Everything
          left of the rail is clipped by the planner's `overflow-hidden` row,
          so the two together fully mask the travel. */}
      <div className="relative z-10 flex w-[60px] shrink-0 flex-col items-center gap-4 bg-background py-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={t(expanded ? "sidebar.collapse" : "sidebar.expand")}
          className="flex size-9 cursor-pointer items-center justify-center rounded-[11px] bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          {expanded ? (
            <ChevronLeftIcon className="size-5" />
          ) : (
            <ChevronRightIcon className="size-5" />
          )}
        </button>
        {TAB_ORDER.map((tab) => {
          const isActive = expanded && activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => (isActive ? close() : openTab(tab))}
              aria-label={tabLabel(tab)}
              aria-pressed={isActive}
              className="flex w-full cursor-pointer flex-col items-center gap-1"
            >
              <TabBadgeIcon
                tab={tab}
                badgeCount={badgeCount[tab]}
                active={isActive}
              />
              <span className="px-0.5 text-center text-[10px] leading-tight font-bold text-muted-foreground">
                {tabLabel(tab)}
              </span>
            </button>
          )
        })}
      </div>

      <div
        className={cn(
          "absolute top-0 bottom-0 left-full flex w-[400px] flex-col border-r bg-background shadow-[8px_0_24px_-16px_rgba(40,60,45,0.45)]",
          // `content-visibility` is transitioned discretely alongside the
          // slide: it flips to `visible` at the start of the open and back to
          // `hidden` only once the close finishes. That gives the old
          // mount/unmount timing (no rendering, layout or a11y presence while
          // collapsed; content still on screen through the whole slide-out)
          // without any transitionend bookkeeping in JS.
          "transition-[translate,content-visibility] transition-discrete duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          expanded
            ? "translate-x-0"
            : // Slide fully off the left edge (own width + the strip) and drop
              // pointer events so the collapsed panel can't intercept canvas
              // clicks from behind the strip.
              "pointer-events-none -translate-x-[calc(100%+60px)] [content-visibility:hidden]"
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-heading text-base font-semibold">
            {tabLabel(activeTab)}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label={t("sidebar.collapse")}
            className="rounded-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
        </div>
        {isChat ? (
          <div className="flex min-h-0 flex-1 flex-col">{content}</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">{content}</div>
        )}
      </div>
    </div>
  )
}
