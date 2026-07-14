import { useTranslation } from "react-i18next"
import { PencilIcon } from "lucide-react"
import { useState } from "react"
import { ReminderFormFields } from "./ReminderFormFields"
import { useWeddingMemberEmails } from "./useWeddingMemberEmails"
import type { Reminder } from "@/stores/reminders.store"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRemindersStore } from "@/stores/reminders.store"

export const EditReminderPopover = ({ reminder }: { reminder: Reminder }) => {
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [text, setText] = useState(reminder.text)
  const [due, setDue] = useState<Date | undefined>(reminder.due)
  const [recipient, setRecipient] = useState(reminder.recipientEmail ?? "")

  const members = useWeddingMemberEmails()
  const updateReminder = useRemindersStore((state) => state.updateReminder)

  // Re-seed the form from the reminder whenever it opens, so edits reflect the
  // latest persisted state (e.g. after a scheduled/sent status change).
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setText(reminder.text)
      setDue(reminder.due)
      setRecipient(reminder.recipientEmail ?? "")
    }
    setOpen(next)
  }

  const handleSave = () => {
    if (!text.trim()) return
    updateReminder(reminder.uuid, {
      text: text.trim(),
      due,
      recipientEmail: recipient.trim() || undefined,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("common.edit")}
          title={t("common.edit")}
          className="text-muted-foreground hover:text-foreground"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <PopoverHeader>
          <PopoverTitle>{t("reminders.edit.title")}</PopoverTitle>
        </PopoverHeader>
        <ReminderFormFields
          text={text}
          onTextChange={setText}
          due={due}
          onDueChange={setDue}
          recipient={recipient}
          onRecipientChange={setRecipient}
          members={members}
        />
        <Button
          className="mt-4 w-full"
          disabled={!text.trim()}
          onClick={handleSave}
        >
          {t("common.save")}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
