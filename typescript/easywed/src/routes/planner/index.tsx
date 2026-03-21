import { createFileRoute } from "@tanstack/react-router"
import { TablePlanner } from "@/components/planner/TablePlanner"

export const Route = createFileRoute("/planner/")({
  component: TablePlanner,
})
