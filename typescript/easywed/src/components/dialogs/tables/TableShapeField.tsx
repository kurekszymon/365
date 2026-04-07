import { useTranslation } from "react-i18next"
import type { TableShape } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface IProps {
  value: TableShape
  onChange: (value: TableShape) => void
}

export const TableShapeField = ({ value, onChange }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("tables.add.shape")}</FieldLabel>
      <FieldContent>
        <Select
          value={value}
          onValueChange={(val) => onChange(val as TableShape)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rectangular">
              {t("tables.add.shape.rectangular")}
            </SelectItem>
            <SelectItem value="round">{t("tables.add.shape.round")}</SelectItem>
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  )
}
