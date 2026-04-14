import { useTranslation } from "react-i18next"
import type { TableShape } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

interface IProps {
  value: TableShape
  onChange: (value: TableShape) => void
}

export const TableShapeField = ({ value, onChange }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("tables.shape")}</FieldLabel>
      <FieldContent>
        <ButtonGroup className="w-full">
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={value === "rectangular" ? "default" : "outline"}
            onClick={() => onChange("rectangular")}
          >
            {t("tables.shape.rectangular")}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={value === "round" ? "default" : "outline"}
            onClick={() => onChange("round")}
          >
            {t("tables.shape.round")}
          </Button>
        </ButtonGroup>
      </FieldContent>
    </Field>
  )
}
