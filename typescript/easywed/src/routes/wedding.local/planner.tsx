import { createFileRoute } from "@tanstack/react-router"
import Planner from "@/components/planner"

export const Route = createFileRoute("/wedding/local/planner")({
  component: Planner,
})
