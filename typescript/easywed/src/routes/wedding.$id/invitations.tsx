import { createFileRoute } from "@tanstack/react-router"
import { InvitationsPage } from "@/components/invitations/InvitationsPage"

export const Route = createFileRoute("/wedding/$id/invitations")({
  component: WeddingInvitationsPage,
})

function WeddingInvitationsPage() {
  const { id } = Route.useParams()
  return <InvitationsPage weddingId={id} />
}
