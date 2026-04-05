import { createFileRoute } from "@tanstack/react-router"
import Planner from "@/components/planner-refactor"

export const Route = createFileRoute("/planner/")({
  component: Planner,
})
