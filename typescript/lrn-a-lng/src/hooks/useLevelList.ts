import { useState, useEffect } from "react"
import type { ContentIndex } from "@/lib/types"
import { fetchContentIndex } from "@/lib/content"

export function useLevelList() {
  const [index, setIndex] = useState<ContentIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchContentIndex()
      .then((data) => {
        if (!cancelled) setIndex(data)
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
  }, [])

  return { index, loading, error }
}
