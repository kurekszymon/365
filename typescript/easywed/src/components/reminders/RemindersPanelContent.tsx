import { CreateReminderPopover } from "./CreateReminderPopover"
import { ReminderList } from "./ReminderList"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"

/**
 * Sidebar "Przypomnienia" tab: add button (popover with the create form) +
 * the flat reminder list. Rendered by the desktop `SidebarRail` and the
 * mobile `MobileTabBar` drawer, like the other entity-list tabs.
 *
 * Reminders are editor-gated in RLS like every other entity, so a viewer gets
 * the list to read and neither the add form nor the per-row actions.
 */
export const RemindersPanelContent = () => {
  const canEdit = useGlobalStore(selectCanEdit)

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <CreateReminderPopover />}
      <ReminderList canEdit={canEdit} />
    </div>
  )
}
