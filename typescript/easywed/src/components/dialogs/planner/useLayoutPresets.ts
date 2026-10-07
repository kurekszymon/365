import { useCallback, useEffect, useState } from "react"
import type { LayoutPreset } from "@/lib/sync/layoutPresets"
import { fetchLayoutPresets } from "@/lib/sync/layoutPresets"

/**
 * One venue's active presets. `null` = failed, `undefined` = loading. RLS
 * decides whose these are: staff and linked couples get the same rows.
 */
export const useLayoutPresets = (tenantId: string) => {
  const [presets, setPresets] = useState<
    Array<LayoutPreset> | null | undefined
  >(undefined)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchLayoutPresets(tenantId).then((rows) => {
      if (!cancelled) setPresets(rows)
    })
    return () => {
      cancelled = true
    }
  }, [tenantId, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { presets, reload }
}
