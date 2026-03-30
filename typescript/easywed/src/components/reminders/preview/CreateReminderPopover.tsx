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
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="center">
        <PopoverHeader>
          <PopoverTitle>{t("reminders.create.title")}</PopoverTitle>
        </PopoverHeader>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <Textarea
              onChange={(e) => setReminderContent(e.target.value)}
              placeholder={t("reminders.create.content_placeholder")}
            />
          </Field>
          <DatePicker
            setDate={setDueDate}
            date={due}
            placeholderTlKey="reminders.create.date_prompt"
          />
          <Button disabled={!reminderContent} onClick={handleSaveReminders}>
            {t("common.create")}
          </Button>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  )
}
