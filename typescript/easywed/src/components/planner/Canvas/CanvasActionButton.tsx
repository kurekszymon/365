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
          "cursor-pointer rounded-md border bg-white p-1 shadow-sm",
          variant === "danger"
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
