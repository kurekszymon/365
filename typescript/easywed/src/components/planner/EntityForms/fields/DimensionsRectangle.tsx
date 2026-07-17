import { useTranslation } from "react-i18next"
import { Field, FieldContent } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"

interface IProps {
  width: number
  height: number
  setWidth: (width: number) => void
  setHeight: (height: number) => void
}
export const DimensionsRectangle = ({
  width,
  height,
  setWidth,
  setHeight,
}: IProps) => {
  const { t } = useTranslation()

  return (
    <Field>
      <FieldContent className="flex-row gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="hall-width">{t("common.width")}</Label>
          <NumberInput
            id="hall-width"
            min={1}
            max={200}
            value={width}
            onValueChange={(next) => setWidth(Math.max(1, next))}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="hall-height">{t("common.height")}</Label>
          <NumberInput
            id="hall-height"
            min={1}
            max={200}
            value={height}
            onValueChange={(next) => setHeight(Math.max(1, next))}
          />
        </div>
      </FieldContent>
    </Field>
  )
}
