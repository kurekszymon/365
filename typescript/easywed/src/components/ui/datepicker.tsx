import { format } from "date-fns"
import { enUS, pl } from "date-fns/locale"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react"
import i18n from "@/i18n"

interface IProps {
  date?: Date
  info?: string
  showFieldLabel?: boolean
  placeholderTlKey?: string
  // Adds a time input under the calendar and keeps the popover open after
  // picking a day so the hour can be set in the same visit.
  withTime?: boolean

  setDate: (date?: Date) => void
}
export function DatePicker({
  date,
  setDate,
  info,
  showFieldLabel,
  placeholderTlKey = "common.pick_date",
  withTime = false,
}: IProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const locale = i18n.language.startsWith("en") ? enUS : pl

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate || !withTime) {
      setDate(selectedDate)
      setOpen(false)
      return
    }
    // Carry the already-chosen time onto the new day (default 09:00).
    const next = new Date(selectedDate)
    next.setHours(date?.getHours() ?? 9, date?.getMinutes() ?? 0, 0, 0)
    setDate(next)
  }

  const handleTimeChange = (value: string) => {
    if (!value) return
    const [hours, minutes] = value.split(":").map(Number)
    const next = date ? new Date(date) : new Date()
    next.setHours(hours, minutes, 0, 0)
    setDate(next)
  }

  return (
    <Field className="w-full">
      {showFieldLabel && (
        <FieldLabel htmlFor="date-picker-button">{t("common.date")}</FieldLabel>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-button"
            className="cursor-pointer justify-start font-normal"
          >
            {date ? (
              format(date, withTime ? "PPP, HH:mm" : "PPP", { locale })
            ) : (
              <span>{t(placeholderTlKey)}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            defaultMonth={date}
            locale={locale}
          />
          {withTime && (
            <div className="border-t p-3">
              <Input
                type="time"
                aria-label={t("common.time")}
                value={date ? format(date, "HH:mm") : ""}
                onChange={(e) => handleTimeChange(e.target.value)}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
      {info && <span>{info}</span>}
    </Field>
  )
}
