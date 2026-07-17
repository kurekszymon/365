import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { NumberInput } from "@/components/ui/number-input"

type RectangularTableProps = {
  width: number
  height: number
  isWidthOutOfBounds: boolean
  isHeightOutOfBounds: boolean
  onWidthChange: (value: number) => void
  onHeightChange: (value: number) => void
  onBlur?: () => void
}

export const RectangularTable = ({
  width,
  height,
  isWidthOutOfBounds,
  isHeightOutOfBounds,
  onWidthChange,
  onHeightChange,
  onBlur,
}: RectangularTableProps) => {
  const { t } = useTranslation()

  // Width and height share one row so the form stays short - the table edit
  // dialog needs the reclaimed vertical space for the seat preview below.
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel>{t("common.width")}</FieldLabel>
        <FieldContent>
          <NumberInput
            min={0.1}
            step={0.1}
            className="w-full rounded-md border"
            value={width}
            onValueChange={onWidthChange}
            onBlur={onBlur}
          />
          {isWidthOutOfBounds && (
            <p className="min-h-4 text-xs text-destructive" aria-live="polite">
              {t("tables.dimensions_oob")}
            </p>
          )}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{t("common.height")}</FieldLabel>
        <FieldContent>
          <NumberInput
            min={0.1}
            step={0.1}
            className="w-full rounded-md border"
            value={height}
            onValueChange={onHeightChange}
            onBlur={onBlur}
          />
          {isHeightOutOfBounds && (
            <p className="min-h-4 text-xs text-destructive" aria-live="polite">
              {t("tables.dimensions_oob")}
            </p>
          )}
        </FieldContent>
      </Field>
    </div>
  )
}
