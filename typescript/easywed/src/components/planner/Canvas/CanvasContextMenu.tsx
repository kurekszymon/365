import { useState } from "react"
import { findCapturedElement } from "./utils"
import type { CapturedElement } from "./utils"
import type { PropsWithChildren, ReactNode } from "react"
import type { Position } from "@/stores/planner.store"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useIsMobile } from "@/hooks/useMediaQuery"

type RenderItemsArgs = {
  position: Position
  inHall: boolean
  // The canvas element the menu was opened on (kind "hall" when on empty hall).
  target: CapturedElement
}

interface Props {
  viewportToHall: (x: number, y: number) => Position
  isInHallBounds: (x: number, y: number) => boolean
  renderItems: (args: RenderItemsArgs) => ReactNode
}

export const CanvasContextMenu = ({
  children,
  viewportToHall,
  isInHallBounds,
  renderItems,
}: PropsWithChildren<Props>) => {
  const isMobile = useIsMobile()
  const [capturedPos, setCapturedPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [inHall, setInHall] = useState(false)
  const [target, setTarget] = useState<CapturedElement>({ kind: "hall" })
  // hack to render at correct position
  const [contentKey, setContentKey] = useState(0)

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) setContentKey((k) => k + 1)
      }}
    >
      <ContextMenuTrigger
        asChild
        onContextMenu={(e) => {
          const captured = findCapturedElement(e.target)
          // On touch, a long-press while dragging a table fires contextmenu on
          // the table — so on mobile keep the menu suppressed for elements (the
          // on-canvas action buttons cover copy/delete there). With a mouse,
          // right-clicking a table/fixture opens the menu with copy actions.
          if (!captured || (captured.kind !== "hall" && isMobile)) {
            e.preventDefault()
            return
          }
          setCapturedPos({ x: e.clientX, y: e.clientY })
          setInHall(isInHallBounds(e.clientX, e.clientY))
          setTarget(captured)
        }}
      >
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent
        key={contentKey}
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
          "duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        )}
        onContextMenu={(e) => e.preventDefault()}
      >
        {renderItems({
          position: viewportToHall(capturedPos.x, capturedPos.y),
          inHall,
          target,
        })}
      </ContextMenuContent>
    </ContextMenu>
  )
}
