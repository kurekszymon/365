import { useTranslation } from "react-i18next"
import { ExternalLinkIcon, ListIcon, PlusIcon } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { Link } from "@tanstack/react-router"
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
import { ButtonGroup } from "@/components/ui/button-group"

// TODO:  write useDatePicker

export const RemindersPreview = () => {
  const { t } = useTranslation()
  const [due, setDueDate] = useState<Date>()

  const [reminderContent, setReminderContent] = useState<string>()

  const { reminders, setReminders } = useRemindersStore(
    useShallow((state) => ({
      reminders: state.reminders,
      setReminders: state.setReminders,
    }))
  )

  const renderReminders = () => {
    // TODO make it nicer
    if (reminders.length === 0) {
      return <></>
    }

    return reminders.map((reminder, index) => (
      <div key={index} className="flex flex-col gap-1">
        <span>
          {reminder.createdAt.toLocaleDateString()} - {reminder.text}
        </span>
      </div>
    ))
  }

  const handleSaveReminders = () => {
    if (!reminderContent) return

    setReminders(reminderContent, due)
    setReminderContent("")
    setDueDate(undefined)
    // TODO: close popover
  }

  return (
    <ButtonGroup>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            {t("reminders.title")}
            <ListIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          {renderReminders()}
          <Button variant={"link"}>
            <Link to="/reminders">{t("reminders.navigate")}</Link>
            <ExternalLinkIcon />
          </Button>
        </PopoverContent>
      </Popover>
      <Popover>
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
                placeholder="for what are you thinking"
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
    </ButtonGroup>
  )
}
