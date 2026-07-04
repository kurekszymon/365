import {
  LayoutPanelLeftIcon,
  SparklesIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import type { SidebarTab } from "@/stores/sidebar.store"
import { usePlannerStore } from "@/stores/planner.store"

// Single source for tab icons, shared by the desktop `SidebarRail` and the
// mobile `MobileTabBar` (which uses the entity-list subset) so the two
// surfaces can't drift apart.
export const TAB_ICONS: Record<SidebarTab, typeof UsersIcon> = {
  guests: UsersIcon,
  tables: UtensilsIcon,
  fixtures: LayoutPanelLeftIcon,
  ai_chat: SparklesIcon,
}

/**
 * Badge counts for the entity tabs. Guests counts those still without a seat
 * (the actionable number); tables/fixtures are plain totals. `ai_chat` never
 * badges. Shared by `SidebarRail` and `MobileTabBar`.
 */
export const useTabBadgeCounts = (): Record<SidebarTab, number> =>
  usePlannerStore(
    useShallow((state) => ({
      guests: state.guests.filter((g) => !g.tableId).length,
      tables: state.tables.length,
      fixtures: state.fixtures.length,
      ai_chat: 0,
    }))
  )
