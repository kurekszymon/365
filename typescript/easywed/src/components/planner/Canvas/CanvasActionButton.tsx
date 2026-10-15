import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface CanvasActionButtonProps {
  icon: React.ReactNode
  label: string
  variant?: "default" | "danger"
  onClick: (e: React.MouseEvent) => void
}

export const CanvasActionButton = ({
  icon,
  label,
  variant = "default",
  onClick,
}: CanvasActionButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className={cn(
          "pressable cursor-pointer rounded-md border bg-background p-1 shadow-sm",
          variant === "danger"
            ? "border-destructive/30 text-destructive hover:bg-destructive/10 active:bg-destructive/15"
            : "border-planner-table-border text-planner-table-foreground hover:bg-planner-soft active:bg-planner-soft"
        )}
        aria-label={label}
        onClick={onClick}
      >
        {icon}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
)
