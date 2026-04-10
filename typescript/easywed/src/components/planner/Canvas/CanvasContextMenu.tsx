import { TableIcon, Settings2Icon, PencilIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useRef, useState } from "react"
import type { PropsWithChildren } from "react"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { Position } from "@/stores/planner.store"
import { findCapturedElement, type CapturedElement } from "./utils"

interface Props {
  onAddTable: (position: Position) => void
  onEditTable: (tableId: string) => void
  onConfigureHall: () => void
  viewportToHall: (x: number, y: number) => Position
  isInHallBounds: (x: number, y: number) => boolean
}

export const CanvasContextMenu = ({
  children,
  onAddTable,
  onEditTable,
  onConfigureHall,
  viewportToHall,
  isInHallBounds,
}: PropsWithChildren<Props>) => {
  const { t } = useTranslation()
  const capturedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [capturedElement, setCapturedElement] =
    useState<CapturedElement | null>(null)
  const [inHall, setInHall] = useState(false)

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) {
          setInHall(
            isInHallBounds(capturedPosRef.current.x, capturedPosRef.current.y)
          )
          return
        }

        setCapturedElement(null)
      }}
    >
      <ContextMenuTrigger
        asChild
        onContextMenu={(e) => {
          capturedPosRef.current = { x: e.clientX, y: e.clientY }
          setInHall(isInHallBounds(e.clientX, e.clientY))
          setCapturedElement(findCapturedElement(e.target))
        }}
      >
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
          "duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        )}
        onContextMenu={(e) => e.preventDefault()}
      >
        {capturedElement?.kind === "table" && (
          <ContextMenuItem
            className={cn(
              "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
              "focus:bg-accent focus:text-accent-foreground",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            )}
            onSelect={() => {
              if (!capturedElement.id) {
                return
              }

              onEditTable(capturedElement.id)
            }}
          >
            <PencilIcon className="size-4" />
            {t("tables.edit")}
          </ContextMenuItem>
        )}

        <ContextMenuItem
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
        </ContextMenuItem>

        <ContextMenuSeparator className="-mx-1 my-1 h-px bg-border" />

        <ContextMenuItem
          className={cn(
            "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
            "focus:bg-accent focus:text-accent-foreground",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          )}
          onSelect={onConfigureHall}
        >
          <Settings2Icon className="size-4" />
          {t("hall.configure_short")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
