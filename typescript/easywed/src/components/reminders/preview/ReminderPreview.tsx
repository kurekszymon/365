import { format, formatDistanceToNow } from "date-fns"
import { enUS, pl } from "date-fns/locale"
import {
  CheckIcon,
  ClockIcon,
  MailIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { EditReminderPopover } from "./EditReminderPopover"
import { EmailStatusBadge } from "./EmailStatusBadge"
import type { Reminder } from "@/stores/reminders.store"
import i18n from "@/i18n"
import { cn } from "@/lib/utils"
import { useRemindersStore } from "@/stores/reminders.store"

const iconButton =
  "text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"

export const ReminderPreview = ({ reminder }: { reminder: Reminder }) => {
  const { t } = useTranslation()
  const { completeReminder, deleteReminder, sendReminderNow } =
    useRemindersStore(
      useShallow((state) => ({
        completeReminder: state.completeReminder,
        deleteReminder: state.deleteReminder,
        sendReminderNow: state.sendReminderNow,
      }))
    )

  const locale = i18n.language.startsWith("en") ? enUS : pl
  const isCompleted = reminder.status === "completed"
  const canSend = !!reminder.recipientEmail && !isCompleted

  return (
    <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn("font-medium break-words", {
            "text-muted-foreground line-through": isCompleted,
          })}
        >
          {reminder.text}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {!isCompleted && (
            <button
              type="button"
              className={iconButton}
              aria-label={t("reminders.actions.complete")}
              title={t("reminders.actions.complete")}
              onClick={() => completeReminder(reminder.uuid)}
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
          {canSend && (
            <button
              type="button"
              className={iconButton}
              aria-label={t("reminders.actions.send_now")}
              title={t("reminders.actions.send_now")}
              onClick={() => sendReminderNow(reminder.uuid)}
            >
              <SendIcon className="h-4 w-4" />
            </button>
          )}
          {!isCompleted && <EditReminderPopover reminder={reminder} />}
          <button
            type="button"
            className={iconButton}
            aria-label={t("common.delete")}
            title={t("common.delete")}
            onClick={() => deleteReminder(reminder.uuid)}
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          {formatDistanceToNow(reminder.createdAt, { locale, addSuffix: true })}
        </span>
        {reminder.due && (
          <span>
            {t("reminders.due_label")} {format(reminder.due, "PP", { locale })}
          </span>
        )}
        {reminder.recipientEmail && (
          <span className="flex items-center gap-1">
            <MailIcon className="h-3 w-3" />
            {reminder.recipientEmail}
          </span>
        )}
        <EmailStatusBadge status={reminder.emailStatus} />
      </div>
    </div>
  )
}
