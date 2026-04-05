import { createFileRoute } from "@tanstack/react-router"
import Planner from "@/components/planner"

export const Route = createFileRoute("/planner/")({
  component: Planner,
})
