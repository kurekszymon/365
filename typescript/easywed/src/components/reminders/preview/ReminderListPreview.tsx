import { ReminderPreview } from "./ReminderPreview"
import { useRemindersStore } from "@/stores/reminders.store"

export const ReminderList = () => {
  const reminders = useRemindersStore((state) => state.reminders)

  if (reminders.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {reminders.map((reminder) => (
        <ReminderPreview key={reminder.uuid} reminder={reminder} />
      ))}
    </div>
  )
}
