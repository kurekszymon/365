import type { TableShape } from "@/stores/planner.store"

export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 240

const PADDING = 24
const HALL_BORDER = "#34d399"
const HALL_FILL = "#ffffff"
const GRID_DOT = "rgba(156, 163, 175, 0.85)"
const TABLE_FILL = "#d1fae5"
const TABLE_BORDER = "#6ee7b7"
const TABLE_DENSITY_FACTOR = 0.1

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  widthInMeters: number,
  heightInMeters: number,
  tableShape: TableShape
) {
  const safeWidth = Math.max(1, widthInMeters)
  const safeHeight = Math.max(1, heightInMeters)

  const hall = getHallRect(safeWidth, safeHeight)
  const ppm = Math.min(hall.width / safeWidth, hall.height / safeHeight)

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.fillStyle = HALL_FILL
  ctx.strokeStyle = HALL_BORDER
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.rect(hall.x, hall.y, hall.width, hall.height)
  ctx.fill()
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  ctx.rect(hall.x, hall.y, hall.width, hall.height)
  ctx.clip()

  drawGrid(ctx, hall.x, hall.y, hall.width, hall.height, ppm)
  drawTables(ctx, hall, safeWidth, safeHeight, tableShape)

  ctx.restore()
}

function getHallRect(widthInMeters: number, heightInMeters: number) {
  const aspectRatio = widthInMeters / heightInMeters
  const availableWidth = CANVAS_WIDTH - PADDING * 2
  const availableHeight = CANVAS_HEIGHT - PADDING * 2

  let width = availableWidth
  let height = availableWidth / aspectRatio

  if (height > availableHeight) {
    height = availableHeight
    width = availableHeight * aspectRatio
  }

  return {
    x: (CANVAS_WIDTH - width) / 2,
    y: (CANVAS_HEIGHT - height) / 2,
    width,
    height,
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  ppm: number
) {
  const spacing = Math.max(ppm, 8)

  ctx.fillStyle = GRID_DOT

  for (let dotY = y + spacing / 2; dotY < y + height; dotY += spacing) {
    for (let dotX = x + spacing / 2; dotX < x + width; dotX += spacing) {
      ctx.beginPath()
      ctx.arc(dotX, dotY, 1.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawTables(
  ctx: CanvasRenderingContext2D,
  hall: { x: number; y: number; width: number; height: number },
  widthInMeters: number,
  heightInMeters: number,
  tableShape: TableShape
) {
  const hallArea = widthInMeters * heightInMeters
  const aspectRatio = widthInMeters / heightInMeters
  const skewRatio = Math.max(aspectRatio, 1 / aspectRatio)

  const skewFactor = 1 / Math.sqrt(skewRatio)
  const targetCount = clamp(
    Math.round((hallArea / 40) * TABLE_DENSITY_FACTOR * skewFactor),
    2,
    48
  )

  const cols = Math.max(1, Math.round(Math.sqrt(targetCount * aspectRatio)))
  const rows = Math.max(1, Math.ceil(targetCount / cols))
  const slotH = hall.height / (rows + 1)
  const slotW = hall.width / (cols + 1)

  const roundRadius = clamp(Math.min(slotW, slotH) * 0.22, 5.5, 18)
  const rectW = clamp(slotW * 0.55, 14, 36)
  const rectH = clamp(slotH * 0.38, 10, 22)

  ctx.fillStyle = TABLE_FILL
  ctx.strokeStyle = TABLE_BORDER
  ctx.lineWidth = 1.5

  let rendered = 0
  for (let row = 0; row < rows && rendered < targetCount; row++) {
    const rowCount = Math.min(cols, targetCount - rendered)
    const rowGapX = hall.width / (rowCount + 1)
    const centerY = hall.y + ((row + 1) * hall.height) / (rows + 1)

    for (let col = 0; col < rowCount; col++) {
      const centerX = hall.x + (col + 1) * rowGapX

      if (tableShape === "rectangular") {
        const left = centerX - rectW / 2
        const top = centerY - rectH / 2

        ctx.beginPath()
        ctx.roundRect(left, top, rectW, rectH, 6)
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(centerX, centerY, roundRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      rendered += 1
      if (rendered >= targetCount) break
    }
  }
}
