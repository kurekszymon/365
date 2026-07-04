import { useTranslation } from "react-i18next"
import type { TableRotation } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

interface IProps {
  value: TableRotation
  onChange: (value: TableRotation) => void
}

export const TableRotationField = ({ value, onChange }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("tables.rotation")}</FieldLabel>
      <FieldContent>
        <ButtonGroup className="w-full">
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={value === 0 ? "default" : "outline"}
            onClick={() => onChange(0)}
          >
            {t("tables.rotation.horizontal")}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={value === 90 ? "default" : "outline"}
            onClick={() => onChange(90)}
          >
            {t("tables.rotation.vertical")}
          </Button>
        </ButtonGroup>
      </FieldContent>
    </Field>
  )
}
