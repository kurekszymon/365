import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface IProps {
  value: number
  onChange: (value: number) => void
  onBlur?: () => void
}

export const TableCapacityField = ({ value, onChange, onBlur }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("tables.capacity")}</FieldLabel>
      <FieldContent>
        <Input
          type="number"
          min={1}
          step={1}
          className="w-full rounded-md border"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={onBlur}
        />
      </FieldContent>
    </Field>
  )
}
