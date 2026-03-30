import { useShallow } from "zustand/react/shallow"
import { ReminderPreview } from "./ReminderPreview"
import { useRemindersStore } from "@/stores/reminders.store"

export const ReminderList = () => {
  const { reminders, completeReminder } = useRemindersStore(
    useShallow((state) => ({
      reminders: state.reminders,
      completeReminder: state.completeReminder,
    }))
  )

  if (reminders.length === 0) return null

  return reminders.map((reminder) => (
    <ReminderPreview
      key={reminder.uuid}
      reminder={reminder}
      completeReminder={completeReminder}
    />
  ))
}
