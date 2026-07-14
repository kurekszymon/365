import { useTranslation } from "react-i18next"
import { PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { ReminderFormFields } from "./ReminderFormFields"
import { useWeddingMemberEmails } from "./useWeddingMemberEmails"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRemindersStore } from "@/stores/reminders.store"

export const CreateReminderPopover = () => {
  const { t } = useTranslation()

  const [due, setDue] = useState<Date>()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [recipient, setRecipient] = useState("")

  const members = useWeddingMemberEmails()
  const setReminders = useRemindersStore((state) => state.setReminders)

  // With a single member (typically a solo planner), default the recipient to
  // their address so the common case needs no typing. One-shot sync from the
  // async-loaded member list; the `!recipient` guard keeps it from cascading.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (members.length === 1 && !recipient) setRecipient(members[0].email)
  }, [members, recipient])

  const handleSave = () => {
    if (!text.trim()) return
    setReminders(text.trim(), due, recipient.trim() || undefined)
    setText("")
    setDue(undefined)
    setRecipient("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center">
        <PopoverHeader>
          <PopoverTitle>{t("reminders.create.title")}</PopoverTitle>
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
          {t("common.create")}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
