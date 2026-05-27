import { useState, useEffect } from "react"
import type { LevelData } from "@/lib/types"
import { fetchLevel } from "@/lib/content"

export function useLevel(file: string | undefined) {
  const [level, setLevel] = useState<LevelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setLoading(true)
    fetchLevel(file)
      .then((data) => {
        if (!cancelled) setLevel(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [file])

  return { level, loading, error }
}
