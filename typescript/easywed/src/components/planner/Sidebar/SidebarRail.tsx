import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutPanelLeftIcon,
  SparklesIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { GuestListContent } from "../GuestPanel/GuestListContent"
import { AiChatPanelContent } from "../PropertyPanel/AiChatPanelContent"
import { TableListContent } from "./TableListContent"
import { FixtureListContent } from "./FixtureListContent"
import type { TransitionEvent } from "react"
import type { SidebarTab } from "@/stores/sidebar.store"
import { useSidebarStore } from "@/stores/sidebar.store"
import { usePlannerStore } from "@/stores/planner.store"
import { cn } from "@/lib/utils"

const TAB_ICONS: Record<SidebarTab, typeof UsersIcon> = {
  guests: UsersIcon,
  tables: UtensilsIcon,
  fixtures: LayoutPanelLeftIcon,
  ai_chat: SparklesIcon,
}

const TAB_ORDER: Array<SidebarTab> = ["guests", "tables", "fixtures", "ai_chat"]

/**
 * Desktop-only unified sidebar (supersedes the old `GuestPanel/GuestRail`):
 * a ~60px icon strip — Guests / Tables / Fixtures / Asystent AI — plus a
 * content column that expands next to it. The strip stays visible while
 * expanded so switching tabs never requires collapsing first; clicking the
 * active tab's icon toggles the panel closed.
 */
export const SidebarRail = () => {
  const { t } = useTranslation()
  const { expanded, activeTab, openTab, setExpanded } = useSidebarStore(
    useShallow((state) => ({
      expanded: state.expanded,
      activeTab: state.activeTab,
      openTab: state.openTab,
      setExpanded: state.setExpanded,
    }))
  )
  const guests = usePlannerStore((state) => state.guests)
  const unseatedCount = guests.filter((g) => !g.tableId).length

  // The tab contents (guest list with search/filter state, the AI chat) are
  // comparatively heavy — reflowing them on every frame of the width
  // transition made expanding feel slow. Mount the active content only once
  // the panel has reached its final width, so the animation itself only
  // repaints an empty panel; collapsing drops it immediately instead of
  // reflowing it while shrinking. Adjusted during render (React's documented
  // alternative to an effect for "reset state when a prop changes") rather
  // than in a useEffect, which would call setState after commit instead of
  // before paint.
  const [showContent, setShowContent] = useState(expanded)
  const [prevExpanded, setPrevExpanded] = useState(expanded)
  if (expanded !== prevExpanded) {
    setPrevExpanded(expanded)
    if (!expanded) setShowContent(false)
  }

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === "width" && expanded) setShowContent(true)
  }

  const tabLabel = (tab: SidebarTab) =>
    tab === "ai_chat" ? t("assistant.title") : t(tab)

  // The AI chat owns its own vertical layout (scrolling transcript + pinned
  // composer), so it fills the column instead of using the padded,
  // auto-scrolling wrapper the list tabs get.
  const isChat = activeTab === "ai_chat"
  const content = {
    guests: <GuestListContent />,
    tables: <TableListContent />,
    fixtures: <FixtureListContent />,
    ai_chat: <AiChatPanelContent />,
  }[activeTab]

  return (
    <div
      className={cn(
        "flex shrink-0 border-r bg-background transition-[width] duration-200",
        expanded ? "w-[460px]" : "w-[60px]"
      )}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="flex w-[60px] shrink-0 flex-col items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
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
          const Icon = TAB_ICONS[tab]
          const isActive = expanded && activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => (isActive ? setExpanded(false) : openTab(tab))}
              aria-label={tabLabel(tab)}
              aria-pressed={isActive}
              className="flex w-full cursor-pointer flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                <Icon className="size-[19px]" />
                {tab === "guests" && unseatedCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {unseatedCount}
                  </span>
                )}
              </span>
              <span className="px-0.5 text-center text-[10px] leading-tight font-bold text-muted-foreground">
                {tabLabel(tab)}
              </span>
            </button>
          )
        })}
      </div>

      {expanded && (
        <div className="flex min-w-0 flex-1 flex-col border-l">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-heading text-base font-semibold">
              {tabLabel(activeTab)}
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={t("sidebar.collapse")}
              className="rounded-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
          </div>
          {showContent &&
            (isChat ? (
              <div className="flex min-h-0 flex-1 flex-col">{content}</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">{content}</div>
            ))}
        </div>
      )}
    </div>
  )
}
