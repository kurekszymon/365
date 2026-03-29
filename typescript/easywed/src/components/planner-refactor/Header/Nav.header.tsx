import { ExternalLinkIcon, ListIcon, PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { Link } from "@tanstack/react-router"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { ButtonGroup } from "@/components/ui/button-group"
import { DatePicker } from "@/components/ui/datepicker"
import { useRemindersStore } from "@/stores/reminders.store"
import { Textarea } from "@/components/ui/textarea"

// TODO:  write useDatePicker
export const Nav = () => {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PopoverForm />
    </div>
  )
}

// TODO: fix mobile view
// TODO: handle proper display of recent reminders
// TODO: navigate to Reminders page.
export function PopoverForm() {
  const { t } = useTranslation()
  const [reminderContent, setReminderContent] = useState<string>()
  const { reminders, setReminders } = useRemindersStore(
    useShallow((state) => ({
      reminders: state.reminders,
      setReminders: state.setReminders,
    }))
  )

  const [due, setDueDate] = useState<Date>()

  const renderReminders = () => {
    if (reminders.length === 0) {
      return <></>
    }

    // TODO: fix
    const r = reminders.slice(0, 3).map((reminder) => {
      return (
        <span key={String(reminder.createdAt)}>
          {reminder.createdAt.toLocaleDateString()} - {reminder.text}
        </span>
      )
    })

    return (
      <>
        <PopoverHeader>
          <PopoverTitle>{t("common.recent")}</PopoverTitle>
        </PopoverHeader>
        {r}
      </>
    )
  }

  const handleSaveReminders = () => {
    if (!reminderContent) {
      return
    }
    setReminders(reminderContent, due)
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
