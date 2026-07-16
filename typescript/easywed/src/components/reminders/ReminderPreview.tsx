import { format, formatDistanceToNow, isPast } from "date-fns"
import { enUS, pl } from "date-fns/locale"
import { CheckIcon, ClockIcon } from "lucide-react"
import type { Reminder } from "@/stores/reminders.store"
import i18n from "@/i18n"
import { cn } from "@/lib/utils"

export const ReminderPreview = ({
  reminder,
  completeReminder,
}: {
  reminder: Reminder
  completeReminder: (uuid: string) => void
}) => {
  // TODO: handle it better? for now it's good enough
  const locale = i18n.language.startsWith("en") ? enUS : pl
  const isOverdue =
    reminder.due && reminder.status === "open" && isPast(reminder.due)

  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
      <div className="flex flex-col">
        <span
          className={cn("truncate font-medium", {
            "line-through": reminder.status === "completed",
          })}
        >
          {reminder.text}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <ClockIcon className="h-3 w-3" />
          {reminder.due
            ? format(reminder.due, "d MMM yyyy, HH:mm", { locale })
            : formatDistanceToNow(reminder.createdAt, {
                locale,
                addSuffix: true,
              })}
        </span>
      </div>
      <div className="ml-2 flex items-center gap-2">
        <CheckIcon
          className="h-4 w-4 cursor-pointer"
          onClick={() => completeReminder(reminder.uuid)}
        />
      </div>
    </div>
  )
}
