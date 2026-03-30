import { formatDistanceToNow } from "date-fns"
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
  return (
    <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2">
      <div className="flex flex-col">
        <span
          className={cn("truncate font-medium", {
            "line-through": reminder.status === "completed",
          })}
        >
          {reminder.text}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          {formatDistanceToNow(reminder.createdAt, {
            // TODO: handle it better? for now it's good enough
            locale: i18n.language.startsWith("en") ? enUS : pl,
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
