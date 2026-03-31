import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawRectangle } from "./canvas"
import type { HallPreset } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"

export const HallPreview = ({
  preset,
  width,
  height,
}: {
  preset: HallPreset
  width: number
  height: number
}) => {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    if (preset === "rectangle") {
      drawRectangle(ctx, width, height)
    }
  }, [preset, width, height])

  if (preset !== "rectangle") {
    return (
      <div className="flex h-[240px] w-full items-center justify-center rounded-md border text-muted-foreground">
        {t("common.not_supported")}
      </div>
    )
  }

  return (
    <Field>
      <FieldLabel>{t("common.preview")}</FieldLabel>
      <FieldContent>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full rounded-md border"
        />
      </FieldContent>
    </Field>
  )
}
