import { useTranslation } from "react-i18next"
import {
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  ListIcon,
  PlusIcon,
} from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { enUS, pl } from "date-fns/locale"
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
import i18n from "@/i18n"
import { cn } from "@/lib/utils"

// TODO:  write useDatePicker

export const RemindersPreview = () => {
  const { t } = useTranslation()
  const [due, setDueDate] = useState<Date>()
  const [open, setOpen] = useState(false)
  const [reminderContent, setReminderContent] = useState<string>()

  const { reminders, completeReminder, setReminders } = useRemindersStore(
    useShallow((state) => ({
      reminders: state.reminders,
      completeReminder: state.completeReminder,
      setReminders: state.setReminders,
    }))
  )

  const renderReminders = () => {
    if (reminders.length === 0) return null

    return reminders.map((reminder) => (
      <div
        key={reminder.uuid}
        className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2"
      >
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
    ))
  }

  const handleSaveReminders = () => {
    if (!reminderContent) return

    setReminders(reminderContent, due)
    setReminderContent("")
    setDueDate(undefined)
    setOpen(false)
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
