import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { HallPreset } from "@/stores/planner.store"
import type { GridSpacing } from "@/components/planner/Canvas/HallSurface"
import { Field, FieldContent, FieldTitle } from "@/components/ui/field"
import { HallSurface } from "@/components/planner/Canvas/HallSurface"

const PADDING = 24

export const HallPreview = ({
  preset,
  width,
  height,
  gridSpacing = 1,
}: {
  preset: HallPreset
  width: number
  height: number
  gridSpacing?: GridSpacing
}) => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const aspectRatio = safeWidth / safeHeight

  const availableWidth = containerSize.width - PADDING * 2
  const availableHeight = containerSize.height - PADDING * 2

  let hallW = availableWidth
  let hallH = availableWidth / aspectRatio

  if (hallH > availableHeight) {
    hallH = availableHeight
    hallW = availableHeight * aspectRatio
  }

  const ppm = hallW / safeWidth
  const left = (containerSize.width - hallW) / 2
  const top = (containerSize.height - hallH) / 2

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (preset !== "rectangle") {
    return (
      <div
        ref={containerRef}
        className="flex h-80 w-full items-center justify-center rounded-md border text-muted-foreground"
      >
        {t("common.not_supported")}
      </div>
    )
  }

  return (
    <Field>
      <FieldTitle>{t("common.preview")}</FieldTitle>
      <FieldContent>
        <div
          ref={containerRef}
          className="relative h-80 w-full overflow-hidden rounded-md border"
        >
          {containerSize.width > 0 && (
            <HallSurface
              left={left}
              top={top}
              width={hallW}
              height={hallH}
              ppm={ppm}
              zoom={1}
              gridStyle="dots"
              snapStep="off"
              gridSpacing={gridSpacing}
            />
          )}
        </div>
      </FieldContent>
    </Field>
  )
}
