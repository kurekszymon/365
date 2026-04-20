import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface IProps {
  value: number
  max: number
  onChange: (value: number) => void
}

export const TableBatchCountField = ({ value, max, onChange }: IProps) => {
  const { t } = useTranslation()

  return (
    <Field>
      <FieldLabel>{t("tables.batch_count")}</FieldLabel>
      <FieldContent>
        <Input
          type="number"
          min={1}
          max={max}
          step={1}
          className="w-full rounded-md border"
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (!Number.isFinite(next)) return
            onChange(Math.min(max, Math.max(1, Math.floor(next))))
          }}
        />
      </FieldContent>
    </Field>
  )
}
