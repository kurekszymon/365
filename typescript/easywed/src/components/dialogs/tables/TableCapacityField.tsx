import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface IProps {
  value: string
  onChange: (value: string) => void
}

export const TableCapacityField = ({ value, onChange }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("tables.add.capacity")}</FieldLabel>
      <FieldContent>
        <Input
          type="number"
          min={1}
          step={1}
          className="w-full rounded-md border"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </FieldContent>
    </Field>
  )
}
