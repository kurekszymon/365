import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type RoundTableProps = {
  diameter: number
  isOutOfBounds: boolean
  onDiameterChange: (value: number) => void
}

export const RoundTable = ({
  diameter,
  isOutOfBounds,
  onDiameterChange,
}: RoundTableProps) => {
  const { t } = useTranslation()

  return (
    <Field>
      <FieldLabel>{t("tables.add.diameter")}</FieldLabel>
      <FieldContent>
        <Input
          type="number"
          min={0.1}
          step={0.1}
          className="w-full rounded-md border"
          value={diameter}
          onChange={(e) => onDiameterChange(Number(e.target.value))}
        />
        {isOutOfBounds && (
          <p className="min-h-4 text-xs text-destructive" aria-live="polite">
            {t("tables.add.dimensions_oob")}
          </p>
        )}
      </FieldContent>
    </Field>
  )
}
