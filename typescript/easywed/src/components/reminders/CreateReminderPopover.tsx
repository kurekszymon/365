import { useTranslation } from "react-i18next"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { Field, FieldGroup } from "@/components/ui/field"
import { DatePicker } from "@/components/ui/datepicker"
import { Textarea } from "@/components/ui/textarea"
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

  const [due, setDueDate] = useState<Date>()
  const [open, setOpen] = useState(false)
  const [reminderContent, setReminderContent] = useState<string>()

  const setReminders = useRemindersStore((state) => state.setReminders)

  const handleSaveReminders = () => {
    if (!reminderContent) return

    setReminders(reminderContent, due)
    setReminderContent("")
    setDueDate(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <PlusIcon />
          {t("reminders.add")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        // Match the full-width trigger button so the form reads as an
        // extension of it rather than a floating card.
        className="w-[var(--radix-popover-trigger-width)]"
        align="center"
      >
        <PopoverHeader>
          <PopoverTitle>{t("reminders.create.title")}</PopoverTitle>
        </PopoverHeader>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <Textarea
              value={reminderContent ?? ""}
              onChange={(e) => setReminderContent(e.target.value)}
              placeholder={t("reminders.create.content_placeholder")}
            />
          </Field>
          <DatePicker
            setDate={setDueDate}
            date={due}
            withTime
            placeholderTlKey="reminders.create.date_prompt"
          />
          <Button disabled={!reminderContent} onClick={handleSaveReminders}>
            {t("reminders.add")}
          </Button>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  )
}
