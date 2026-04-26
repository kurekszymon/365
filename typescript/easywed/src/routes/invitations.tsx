import { createFileRoute } from "@tanstack/react-router"
import { InvitationsPage } from "@/components/invitations/InvitationsPage"

export const Route = createFileRoute("/invitations")({
  component: InvitationsPage,
})
