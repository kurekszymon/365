import { useTranslation } from "react-i18next"
import { RotateCw } from "lucide-react"
import type { TableRotation } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"

interface IProps {
  value: TableRotation
  onChange: (value: TableRotation) => void
}

// Rotation only ever toggles between 0 and 90, so a single "flip 90°" action
// reads more clearly than a horizontal/vertical toggle pair - the width/height
// inputs and the seat preview already convey the resulting orientation.
export const TableRotationField = ({ value, onChange }: IProps) => {
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel>{t("tables.rotation")}</FieldLabel>
      <FieldContent>
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="w-full"
          onClick={() => onChange(value === 90 ? 0 : 90)}
        >
          <RotateCw className="size-3.5" />
          {t("tables.rotation.flip")}
        </Button>
      </FieldContent>
    </Field>
  )
}
