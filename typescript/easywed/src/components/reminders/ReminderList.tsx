import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { ReminderPreview } from "./ReminderPreview"
import { useRemindersStore } from "@/stores/reminders.store"

export const ReminderList = () => {
  const { t } = useTranslation()

  const { reminders, completeReminder } = useRemindersStore(
    useShallow((state) => ({
      reminders: state.reminders,
      completeReminder: state.completeReminder,
    }))
  )

  if (reminders.length === 0)
    return (
      <p className="text-sm text-muted-foreground">{t("reminders.empty")}</p>
    )

  return (
    <div className="flex flex-col gap-2">
      {reminders.map((reminder) => (
        <ReminderPreview
          key={reminder.uuid}
          reminder={reminder}
          completeReminder={completeReminder}
        />
      ))}
    </div>
  )
}
