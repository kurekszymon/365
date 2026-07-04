import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface IProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

export const TableNameField = ({ value, onChange, onBlur }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("common.name")}</FieldLabel>
      <FieldContent>
        <Input
          type="text"
          value={value}
          className="w-full rounded-md border"
          placeholder={t("tables.name_placeholder")}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </FieldContent>
    </Field>
  )
}
