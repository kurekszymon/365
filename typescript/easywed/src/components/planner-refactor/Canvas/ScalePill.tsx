import { useGlobalStore } from "@/stores/global.store"

type ScalePillProps = {
  scale?: number
}

export const ScalePill = ({ scale }: ScalePillProps) => {
  const viewport = useGlobalStore((state) => state.viewport)
  const currentScale = scale ?? viewport.scale

  return (
    <div className="absolute right-3 bottom-3 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm">
      {Math.round(currentScale * 100)}%
    </div>
  )
}
