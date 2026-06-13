import { useState } from "react"

export function useExpandableRows<T>(rows: Array<T>, initial = 6) {
  const [expanded, setExpanded] = useState(false)
  const remaining = Math.max(0, rows.length - initial)
  return {
    visible: expanded ? rows : rows.slice(0, initial),
    remaining: expanded ? 0 : remaining,
    isExpanded: expanded,
    showAll: () => setExpanded(true),
  }
}
