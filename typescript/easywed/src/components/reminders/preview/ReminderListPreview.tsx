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
      <p className="px-3 py-2 text-center text-sm text-muted-foreground">
        {t("reminders.empty")}
      </p>
    )

  return reminders.map((reminder) => (
    <ReminderPreview
      key={reminder.uuid}
      reminder={reminder}
      completeReminder={completeReminder}
    />
  ))
}
