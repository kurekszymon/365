import { useTranslation } from "react-i18next"
import type { Dietary } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const DIETARY_OPTIONS: Array<Dietary> = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "halal",
  "kosher",
]

export type GuestFormValues = {
  name: string
  dietary: Array<Dietary>
  note: string
}

// Controlled name/dietary/note fields shared by the add and edit guest dialogs
// so the two stay in sync. The parent owns the values and persistence.
export const GuestFormFields = ({
  value,
  onChange,
}: {
  value: GuestFormValues
  onChange: (value: GuestFormValues) => void
}) => {
  const { t } = useTranslation()

  const toggleDietary = (option: Dietary) => {
    onChange({
      ...value,
      dietary: value.dietary.includes(option)
        ? value.dietary.filter((o) => o !== option)
        : [...value.dietary, option],
    })
  }

  return (
    <>
      <Field>
        <FieldLabel>{t("guests.add.name")}</FieldLabel>
        <FieldContent>
          <Input
            placeholder={t("guests.add.name_placeholder")}
            type="text"
            className="w-full rounded-md border"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>{t("guests.add.dietary_preferences")}</FieldLabel>
        <FieldContent className="flex-row flex-wrap gap-1.5">
          {DIETARY_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={value.dietary.includes(option) ? "default" : "outline"}
              className="rounded-full"
              onClick={() => toggleDietary(option)}
            >
              {t(`guests.dietary.${option}`)}
            </Button>
          ))}
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>{t("guests.add.note")}</FieldLabel>
        <FieldContent>
          <Input
            placeholder={t("guests.add.note_placeholder")}
            type="text"
            className="w-full rounded-md border"
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        </FieldContent>
      </Field>
    </>
  )
}
