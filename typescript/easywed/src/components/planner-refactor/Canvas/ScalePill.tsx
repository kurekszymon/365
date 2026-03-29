import { useGlobalStore } from "@/stores/global.store"

export const ScalePill = () => {
  const viewport = useGlobalStore((state) => state.viewport)

  return (
    <div className="absolute right-3 bottom-3 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm">
      {Math.round(viewport.scale * 100)}%
    </div>
  )
}
