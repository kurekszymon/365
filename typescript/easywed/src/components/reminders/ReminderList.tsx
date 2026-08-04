import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { ReminderPreview } from "./ReminderPreview"
import { useRemindersStore } from "@/stores/reminders.store"

export const ReminderList = ({ canEdit = true }: { canEdit?: boolean }) => {
  const { t } = useTranslation()

  const { reminders, completeReminder, removeReminder } = useRemindersStore(
    useShallow((state) => ({
      reminders: state.reminders,
      completeReminder: state.completeReminder,
      removeReminder: state.removeReminder,
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
          canEdit={canEdit}
          completeReminder={completeReminder}
          removeReminder={removeReminder}
        />
      ))}
    </div>
  )
}
