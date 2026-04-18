import { ContextMenuItem } from "../../ui/context-menu"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export const CanvasContextMenuItem = ({
  className,
  ...props
}: ComponentProps<typeof ContextMenuItem>) => (
  <ContextMenuItem
    className={cn(
      "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
)
