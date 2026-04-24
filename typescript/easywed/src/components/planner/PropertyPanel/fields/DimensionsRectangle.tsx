import { useTranslation } from "react-i18next"
import { Field, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface IProps {
  width: number
  height: number
  setWidth: (width: number) => void
  setHeight: (height: number) => void
  onBlur?: () => void
}
export const DimensionsRectangle = ({
  width,
  height,
  setWidth,
  setHeight,
  onBlur,
}: IProps) => {
  const { t } = useTranslation()

  return (
    <Field>
      <FieldContent className="flex-row gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="hall-width">{t("common.width")}</Label>
          <Input
            id="hall-width"
            type="number"
            min={1}
            max={200}
            value={width}
            onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
            onBlur={onBlur}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="hall-height">{t("common.height")}</Label>
          <Input
            id="hall-height"
            type="number"
            min={1}
            max={200}
            value={height}
            onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
            onBlur={onBlur}
          />
        </div>
      </FieldContent>
    </Field>
  )
}
