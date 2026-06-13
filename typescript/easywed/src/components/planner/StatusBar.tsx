import { RulerIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface StatusBarProps {
  /** True once the first measurement point is placed (waiting for the second click). */
  isMeasureStarted: boolean
}

export const StatusBar = ({ isMeasureStarted }: StatusBarProps) => {
  const { t } = useTranslation()
  const pillRef = useRef<HTMLDivElement>(null)
  // While faded the pill is click-through, so the user can drop a measurement
  // point on the hall behind it.
  const [faded, setFaded] = useState(false)

  // Once faded the pill is pointer-events:none, so onMouseLeave never fires.
  // Watch the document pointer instead and un-fade as soon as it leaves the box.
  useEffect(() => {
    if (!faded) return
    const onMove = (e: PointerEvent) => {
      const rect = pillRef.current?.getBoundingClientRect()
      // No rect means the pill unmounted (measure mode exited) — un-fade too.
      if (
        !rect ||
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setFaded(false)
      }
    }
    document.addEventListener("pointermove", onMove)
    return () => document.removeEventListener("pointermove", onMove)
  }, [faded])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center print:hidden">
      <div
        ref={pillRef}
        onMouseEnter={() => setFaded(true)}
        className={cn(
          "flex items-center gap-3 rounded-full border border-teal-200 bg-teal-50/90 px-4 py-2 text-xs text-teal-700 shadow-md backdrop-blur-sm transition-opacity",
          faded
            ? "pointer-events-none opacity-20"
            : "pointer-events-auto opacity-100"
        )}
      >
        <RulerIcon className="size-3.5 shrink-0" />
        <span>
          {t(isMeasureStarted ? "measure.statusbar_drop" : "measure.statusbar")}
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-teal-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>
          <span className="text-teal-600">{t("statusbar.esc_to_exit")}</span>
        </span>
      </div>
    </div>
  )
}
