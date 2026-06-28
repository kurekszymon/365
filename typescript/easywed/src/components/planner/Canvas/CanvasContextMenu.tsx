import { useState } from "react"
import { useDndContext } from "@dnd-kit/core"
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
  // Non-null while a table/fixture is being dragged (PointerSensor past its 8px
  // threshold). A long-press can fire `contextmenu` mid-drag — especially on
  // touch — so we use this to suppress the menu only then, not on all touches.
  const { active } = useDndContext()
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
          // Suppress the menu only while a drag is in progress (a long-press can
          // fire contextmenu mid-drag). Otherwise right-clicking / long-pressing
          // a table/fixture opens the menu with its copy actions.
          if (!captured || active) {
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
