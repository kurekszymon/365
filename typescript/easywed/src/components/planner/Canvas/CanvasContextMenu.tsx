import { useRef, useState } from "react"
import type { PropsWithChildren, ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { Position } from "@/stores/planner.store"

type RenderItemsArgs = {
  position: Position
  inHall: boolean
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
  const capturedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [inHall, setInHall] = useState(false)
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
          capturedPosRef.current = { x: e.clientX, y: e.clientY }
          setInHall(isInHallBounds(e.clientX, e.clientY))
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
          position: viewportToHall(
            capturedPosRef.current.x,
            capturedPosRef.current.y
          ),
          inHall,
        })}
      </ContextMenuContent>
    </ContextMenu>
  )
}
