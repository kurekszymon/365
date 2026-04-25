import { createFileRoute } from "@tanstack/react-router"
import Reminders from "@/components/reminders"

export const Route = createFileRoute("/wedding/$id/reminders")({
  component: Reminders,
})
