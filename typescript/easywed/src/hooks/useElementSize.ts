import { useEffect, useState } from "react"

export const useElementSize = () => {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!element) return

    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width))
      setHeight(Math.round(entry.contentRect.height))
    })

    ro.observe(element)

    return () => ro.disconnect()
  }, [element])

  return { width, height, element, ref: setElement }
}
