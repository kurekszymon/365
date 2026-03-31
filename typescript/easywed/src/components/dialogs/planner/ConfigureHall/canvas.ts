export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 240
const PADDING = 24

export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  widthInMeters: number,
  heightInMeters: number
) {
  const aspectRatio = widthInMeters / heightInMeters
  const availableWidth = CANVAS_WIDTH - PADDING * 2
  const availableHeight = CANVAS_HEIGHT - PADDING * 2

  let rectWidth: number, rectHeight: number
  if (aspectRatio >= availableWidth / availableHeight) {
    rectWidth = availableWidth
    rectHeight = availableWidth / aspectRatio
  } else {
    rectHeight = availableHeight
    rectWidth = availableHeight * aspectRatio
  }

  const x = (CANVAS_WIDTH - rectWidth) / 2
  const y = (CANVAS_HEIGHT - rectHeight) / 2

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  applyCommonStyles(ctx)
  ctx.beginPath()
  ctx.rect(x, y, rectWidth, rectHeight)
  ctx.fill()
  ctx.stroke()

  applyCommonTextStyles(ctx)
  ctx.fillText(
    `${widthInMeters}m × ${heightInMeters}m`,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2
  )
}

function applyCommonStyles(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f0f4ff"
  ctx.strokeStyle = "#374151"
  ctx.lineWidth = 2
}

function applyCommonTextStyles(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#374151"
  ctx.font = "13px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
}
