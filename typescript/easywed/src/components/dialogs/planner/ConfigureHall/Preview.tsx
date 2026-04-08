import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawRectangle } from "./canvas-utils"
import type { HallPreset, TableShape } from "@/stores/planner.store"
import { Field, FieldContent, FieldTitle } from "@/components/ui/field"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"

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
  const [tableShape, setTableShape] = useState<TableShape>("rectangular")

  useEffect(() => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // https://stackoverflow.com/questions/15661339/how-do-i-fix-blurry-text-in-my-html5-canvas
    const ratio = window.devicePixelRatio || 1
    canvasRef.current.width = CANVAS_WIDTH * ratio
    canvasRef.current.height = CANVAS_HEIGHT * ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(ratio, ratio)

    if (preset === "rectangle") {
      drawRectangle(ctx, width, height, tableShape)
    }
  }, [preset, width, height, tableShape])

  if (preset !== "rectangle") {
    return (
      <div className="flex h-[240px] w-full items-center justify-center rounded-md border text-muted-foreground">
        {t("common.not_supported")}
      </div>
    )
  }

  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldTitle>{t("common.preview")}</FieldTitle>
        <ButtonGroup>
          <Button
            type="button"
            size="xs"
            variant={tableShape === "rectangular" ? "default" : "outline"}
            onClick={() => setTableShape("rectangular")}
          >
            {t("tables.add.shape.rectangular")}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={tableShape === "round" ? "default" : "outline"}
            onClick={() => setTableShape("round")}
          >
            {t("tables.add.shape.round")}
          </Button>
        </ButtonGroup>
      </div>
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
