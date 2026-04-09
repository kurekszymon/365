import { ContextMenu } from "radix-ui"
import { TableIcon, Settings2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { Position } from "@/stores/planner.store"

type Props = {
  children: ReactNode
  onAddTable: (hallPosition: Position) => void
  onConfigureHall: () => void
  /** Convert a viewport point (clientX, clientY) to hall-space coordinates */
  viewportToHall: (x: number, y: number) => Position
  /** Return true if the viewport point is inside the hall rectangle */
  isInHallBounds: (x: number, y: number) => boolean
}

export const CanvasContextMenu = ({
  children,
  onAddTable,
  onConfigureHall,
  viewportToHall,
  isInHallBounds,
}: Props) => {
  const { t } = useTranslation()
  const capturedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [inHall, setInHall] = useState(false)

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (open) {
          setInHall(isInHallBounds(capturedPosRef.current.x, capturedPosRef.current.y))
        }
      }}
    >
      <ContextMenu.Trigger
        asChild
        onContextMenu={(e) => {
          capturedPosRef.current = { x: e.clientX, y: e.clientY }
        }}
      >
        {children}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(
            "z-50 min-w-40 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
            "duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ContextMenu.Item
            className={cn(
              "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
              "focus:bg-accent focus:text-accent-foreground",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            )}
            disabled={!inHall}
            onSelect={() => {
              const pos = viewportToHall(
                capturedPosRef.current.x,
                capturedPosRef.current.y
              )
              onAddTable(pos)
            }}
          >
            <TableIcon className="size-4" />
            {t("tables.add")}
          </ContextMenu.Item>

          <ContextMenu.Separator className="-mx-1 my-1 h-px bg-border" />

          <ContextMenu.Item
            className={cn(
              "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
              "focus:bg-accent focus:text-accent-foreground",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            )}
            onSelect={onConfigureHall}
          >
            <Settings2Icon className="size-4" />
            {t("hall.configure_short")}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
