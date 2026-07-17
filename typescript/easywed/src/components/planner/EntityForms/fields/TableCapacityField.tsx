import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { NumberInput } from "@/components/ui/number-input"

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
        <NumberInput
          min={1}
          step={1}
          className="w-full rounded-md border"
          value={value}
          onValueChange={onChange}
          onBlur={onBlur}
        />
      </FieldContent>
    </Field>
  )
}
