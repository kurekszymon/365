import { format } from "date-fns"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface IProps {
  date?: Date
  info?: string

  setDate: (date?: Date) => void
}
export function DatePicker({ date, setDate, info }: IProps) {
  const { t } = useTranslation()
  return (
    <Field className="w-full">
      <FieldLabel htmlFor="date-picker-button">{t("common.date")}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-button"
            className="cursor-pointer justify-start font-normal"
          >
            {date ? format(date, "PPP") : <span>{t("common.pick_date")}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            defaultMonth={date}
          />
        </PopoverContent>
      </Popover>
      {info && <span>{info}</span>}
    </Field>
  )
}
