import { TAB_ICONS } from "./tabs"
import type { EntityListTab } from "@/stores/entityList.store"
import { cn } from "@/lib/utils"

type TabBadgeIconProps = {
  tab: EntityListTab
  badgeCount: number
  // Desktop rail inverts the circle for the active tab; the mobile bar has no
  // per-tab active state, so it never passes this.
  active?: boolean
}

// Icon-in-a-circle with an optional count badge - the shared visual for a tab
// button in both the desktop `SidebarRail` strip and the mobile `MobileTabBar`.
export const TabBadgeIcon = ({
  tab,
  badgeCount,
  active = false,
}: TabBadgeIconProps) => {
  const Icon = TAB_ICONS[tab]
  return (
    <span
      className={cn(
        "relative flex size-9 items-center justify-center rounded-full",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-primary/10 text-primary"
      )}
    >
      <Icon className="size-[19px]" />
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {badgeCount}
        </span>
      )}
    </span>
  )
}
