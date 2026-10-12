import { useEffect, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import type { TenantInvitePreviewResult } from "@/lib/sync/tenant"
import { previewTenantInvitation } from "@/lib/sync/tenant"
import { inviteHopUrl } from "@/lib/tenant/inviteOrigin"
import { apexOrigin } from "@/lib/tenant/host"
import { track } from "@/lib/analytics/track"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { VenueInviteCard } from "@/components/tenant/invite/VenueInviteCard"
import { VenueInviteCustomerAccept } from "@/components/tenant/invite/VenueInviteCustomerAccept"
import { VenueInviteSignIn } from "@/components/tenant/invite/VenueInviteSignIn"
import { VenueInviteStaffJoin } from "@/components/tenant/invite/VenueInviteStaffJoin"

/**
 * A venue invitation: preview first, act second.
 *
 * The path shape is load-bearing, not tidy: the token is a bearer credential,
 * and both `scrubInviteTokens` and `robots.txt` match on the literal segment
 * `/invite/`, so sitting inside it means this route is covered by the redaction
 * that already exists. Filed as `venue_.invite.$token` so it does not nest under
 * the anonymous entry page at `/venue`.
 *
 * The order of the states is the design:
 *
 *   1. **Preview** (`tenant_invitation_preview`, callable signed out). Nothing
 *      is spent by opening the link - the claim used to happen on page load,
 *      which made "opened a URL" count as consent and let the wrong partner
 *      burn a couple's link.
 *   2. **Right origin.** A customer invite belongs on the apex, a staff invite
 *      on its venue's host; sessions are per-origin, so the page moves before
 *      it asks anyone to sign in (inviteOrigin.ts).
 *   3. **Session.** Signed out gets the venue's name and two doors carrying
 *      `next` back here - no `requireAuth` bounce, which would show a bare
 *      login form with no hint of why.
 *   4. **Act.** Staff click Join (`claim_tenant_invitation`). A couple picks a
 *      plan and clicks Accept (`accept_customer_invitation`), then lands in the
 *      planner with the venue dialog open - linking is not the consent, and
 *      the dialog is where that is given.
 *
 * Public in AuthGate by prefix (`/venue`), so it renders without waiting for
 * the session; the auth-dependent states wait on `isReady` themselves, which
 * lets the preview request run in parallel with session hydration.
 */
export const Route = createFileRoute("/venue_/invite/$token")({
  component: VenueInvitePage,
})

function VenueInvitePage() {
  const { t } = useTranslation()
  const { token } = Route.useParams()
  const isReady = useAuthStore((s) => s.isReady)
  const userId = useAuthStore((s) => s.session?.user.id)

  const [result, setResult] = useState<TenantInvitePreviewResult | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    // Effect-owned external call; the setState is a sync from the server.
    void previewTenantInvitation(token, controller.signal).then((next) => {
      if (controller.signal.aborted) return
      setResult(next)
    })

    return () => controller.abort()
  }, [token, reloadKey])

  const preview = result?.kind === "ok" ? result.preview : null
  const hop = preview
    ? inviteHopUrl(preview.role, preview.tenant.slug, token)
    : null

  useEffect(() => {
    if (hop) window.location.replace(hop)
  }, [hop])

  // Once per page view, and only on the origin the invite belongs on - the
  // hop is a second page view of the same invitation, not a second visitor.
  const tracked = useRef(false)
  useEffect(() => {
    if (!preview || hop || tracked.current) return
    tracked.current = true
    track("tenant_invite_previewed", { role: preview.role })
  }, [preview, hop])

  if (!result || hop) {
    return <VenueInviteCard title={t("venue_invite.checking")} />
  }

  if (result.kind === "failed") {
    return (
      <VenueInviteCard
        title={t("venue_invite.error_title")}
        body={t("venue_invite.error.failed")}
      >
        <Button
          onClick={() => {
            setResult(null)
            setReloadKey((k) => k + 1)
          }}
        >
          {t("common.try_again")}
        </Button>
      </VenueInviteCard>
    )
  }

  if (result.kind === "invalid") {
    return (
      <VenueInviteCard
        title={t("venue_invite.error_title")}
        body={t("venue_invite.error.invalid")}
      >
        <Button asChild variant="outline">
          <a href={`${apexOrigin()}/home`}>{t("venue_invite.error_cta")}</a>
        </Button>
      </VenueInviteCard>
    )
  }

  const { preview: live } = result

  if (live.tenant.status === "suspended") {
    return (
      <VenueInviteCard
        tenant={live.tenant}
        title={t("venue_invite.error_title")}
        body={t("venue_invite.error.suspended", { name: live.tenant.name })}
      />
    )
  }

  if (!isReady) {
    return (
      <VenueInviteCard
        tenant={live.tenant}
        title={t("venue_invite.checking")}
      />
    )
  }

  if (!userId) {
    return <VenueInviteSignIn token={token} preview={live} />
  }

  return live.role === "staff" ? (
    <VenueInviteStaffJoin token={token} preview={live} />
  ) : (
    <VenueInviteCustomerAccept token={token} userId={userId} preview={live} />
  )
}
