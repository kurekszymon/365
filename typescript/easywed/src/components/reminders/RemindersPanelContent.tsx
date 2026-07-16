import { CreateReminderPopover } from "./CreateReminderPopover"
import { ReminderList } from "./ReminderList"

/**
 * Sidebar "Przypomnienia" tab: add button (popover with the create form) +
 * the flat reminder list. Rendered by the desktop `SidebarRail` and the
 * mobile `MobileTabBar` drawer, like the other entity-list tabs.
 */
export const RemindersPanelContent = () => {
  return (
    <div className="flex flex-col gap-4">
      <CreateReminderPopover />
      <ReminderList />
    </div>
  )
}
