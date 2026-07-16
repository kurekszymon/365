import {
  BellIcon,
  LayoutPanelLeftIcon,
  SparklesIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import type { EntityListTab } from "@/stores/entityList.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useRemindersStore } from "@/stores/reminders.store"

// Single source for tab icons, shared by the desktop `SidebarRail` and the
// mobile `MobileTabBar` (which uses the entity-list subset) so the two
// surfaces can't drift apart.
export const TAB_ICONS: Record<EntityListTab, typeof UsersIcon> = {
  guests: UsersIcon,
  tables: UtensilsIcon,
  fixtures: LayoutPanelLeftIcon,
  reminders: BellIcon,
  ai_chat: SparklesIcon,
}

/**
 * Badge counts for the entity tabs. Guests counts those still without a seat
 * and reminders those still open (the actionable numbers); tables/fixtures
 * are plain totals. `ai_chat` never badges. Shared by `SidebarRail` and
 * `MobileTabBar`.
 */
export const useTabBadgeCounts = (): Record<EntityListTab, number> => {
  const reminders = useRemindersStore(
    (state) => state.reminders.filter((r) => r.status === "open").length
  )
  const plannerCounts = usePlannerStore(
    useShallow((state) => ({
      guests: state.guests.filter((g) => !g.tableId).length,
      tables: state.tables.length,
      fixtures: state.fixtures.length,
    }))
  )
  return { ...plannerCounts, reminders, ai_chat: 0 }
}
