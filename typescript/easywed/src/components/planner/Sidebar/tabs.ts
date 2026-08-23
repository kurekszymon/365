import {
  BellIcon,
  ChefHatIcon,
  LayoutPanelLeftIcon,
  SparklesIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import type { EntityListTab } from "@/stores/entityList.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useRemindersStore } from "@/stores/reminders.store"
import {
  selectIncompleteCourseCount,
  useMenuStore,
} from "@/stores/menu.store"

// Single source for tab icons, shared by the desktop `SidebarRail` and the
// mobile `MobileTabBar` (which uses the entity-list subset) so the two
// surfaces can't drift apart.
export const TAB_ICONS: Record<EntityListTab, typeof UsersIcon> = {
  guests: UsersIcon,
  tables: UtensilsIcon,
  fixtures: LayoutPanelLeftIcon,
  reminders: BellIcon,
  menu: ChefHatIcon,
  ai_chat: SparklesIcon,
}

/**
 * Badge counts for the entity tabs. Guests counts those still without a seat,
 * reminders those still open, and menu the courses still short of the number
 * of dishes the venue asked for - the actionable numbers, so each badge goes
 * away once there is nothing left to do. Tables/fixtures are plain totals.
 * `ai_chat` never badges. Shared by `SidebarRail` and `MobileTabBar`.
 */
export const useTabBadgeCounts = (): Record<EntityListTab, number> => {
  const reminders = useRemindersStore(
    (state) => state.reminders.filter((r) => r.status === "open").length
  )
  const menu = useMenuStore(selectIncompleteCourseCount)
  const plannerCounts = usePlannerStore(
    useShallow((state) => ({
      guests: state.guests.filter((g) => !g.tableId).length,
      tables: state.tables.length,
      fixtures: state.fixtures.length,
    }))
  )
  return { ...plannerCounts, reminders, menu, ai_chat: 0 }
}
