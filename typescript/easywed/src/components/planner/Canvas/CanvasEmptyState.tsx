import { PlusCircleIcon } from "lucide-react"

export const CanvasEmptyState = ({
  onClick,
  message,
}: {
  onClick: () => void
  message: string
}) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div
        className="flex h-64 w-64 cursor-pointer flex-col items-center justify-center gap-3 text-muted-foreground"
        onClick={onClick}
      >
        <PlusCircleIcon className="h-10 w-10 opacity-30" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}
