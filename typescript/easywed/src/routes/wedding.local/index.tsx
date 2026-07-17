import { createFileRoute, redirect } from "@tanstack/react-router"

// No hub for guest mode (unlike /wedding/$id/) - go straight to the planner.
export const Route = createFileRoute("/wedding/local/")({
  beforeLoad: () => {
    throw redirect({ to: "/wedding/local/planner", replace: true })
  },
})
