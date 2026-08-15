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
      {/* A button in everything but tag name: it is the only way into the
          planner from here, so it has to be reachable by keyboard and
          announced as an action. Not a <button> because the surrounding canvas
          styles the target as a large drop-zone panel rather than a control. */}
      <div
        role="button"
        tabIndex={0}
        className="flex h-64 w-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return
          // Space would scroll the canvas container underneath.
          e.preventDefault()
          onClick()
        }}
      >
        <PlusCircleIcon className="h-10 w-10 opacity-30" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}
