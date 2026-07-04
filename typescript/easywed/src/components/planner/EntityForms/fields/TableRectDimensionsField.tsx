import { useTranslation } from "react-i18next"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

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

  return (
    <>
      <Field>
        <FieldLabel>{t("common.width")}</FieldLabel>
        <FieldContent>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            className="w-full rounded-md border"
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
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
          <Input
            type="number"
            min={0.1}
            step={0.1}
            className="w-full rounded-md border"
            value={height}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            onBlur={onBlur}
          />
          {isHeightOutOfBounds && (
            <p className="min-h-4 text-xs text-destructive" aria-live="polite">
              {t("tables.dimensions_oob")}
            </p>
          )}
        </FieldContent>
      </Field>
    </>
  )
}
