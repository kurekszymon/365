import { useGlobalStore } from "@/stores/global.store"

type ScalePillProps = {
  reset: () => void
  scale?: number
}

export const ScalePill = ({ scale, reset }: ScalePillProps) => {
  const viewport = useGlobalStore((state) => state.viewport)
  const currentScale = scale ?? viewport.scale

  return (
    <div
      className="absolute top-3 right-3 z-20 cursor-pointer rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm"
      data-no-pan
      onClick={reset}
    >
      {Math.round(currentScale * 100)}%
    </div>
  )
}
