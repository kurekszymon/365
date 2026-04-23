import { createFileRoute } from "@tanstack/react-router"
import { requireAuth } from "@/lib/auth/guards"
import Reminders from "@/components/reminders"

export const Route = createFileRoute("/reminders/")({
  beforeLoad: () => {
    requireAuth("/reminders")
  },
  component: Reminders,
})
