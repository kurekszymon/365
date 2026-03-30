import { CreateReminderPopover } from "./CreateReminderPopover"

import { ListRemindersPopover } from "./ListRemindersPopover"

import { ButtonGroup } from "@/components/ui/button-group"

// TODO:  write useDatePicker

export const RemindersPreview = () => {
  return (
    <ButtonGroup>
      <ListRemindersPopover />
      <CreateReminderPopover />
    </ButtonGroup>
  )
}
