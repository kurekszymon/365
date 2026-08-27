import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import type { ClaimedTenant, TenantClaimResult } from "@/lib/sync/tenant"
import { requireAuth } from "@/lib/auth/guards"
import { claimTenantInvitation } from "@/lib/sync/tenant"
import { apexOrigin, tenantUrl } from "@/lib/tenant/host"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"

/**
 * Claiming a venue invitation.
 *
 * The path is `/venue/invite/$token` rather than something like
 * `/venue-invite/$token`, and the shape is load-bearing rather than tidy: the
 * token is a bearer credential, and both `scrubInviteTokens` (which keeps it
 * out of PostHog) and `robots.txt` match on the literal segment `/invite/`.
 * Sitting inside that segment means this route is covered by the redaction that
 * already exists, instead of needing a second pattern that the next reader has
 * to remember to keep in step. Filed as `venue_.invite.$token` so it does not
 * nest under the anonymous entry page at `/venue`.
 *
 * Unlike `/invite/$token`, which drops the claimer straight into the wedding,
 * this ends on a card rather than a redirect. Two reasons:
 *
 *   - the couple needs to be told *what* they joined, by name, before anything
 *     else happens - the venue is the party they are about to be able to
 *     disclose to;
 *   - joining is not the end of the flow. A `customer` row buys exactly one
 *     thing, the ability to link a wedding to this venue, and that is a
 *     separate act on a separate screen. Redirecting to /home would leave
 *     someone who did the right thing looking at an unchanged wedding list.
 */
export const Route = createFileRoute("/venue_/invite/$token")({
  beforeLoad: ({ params }) => {
    requireAuth(`/venue/invite/${params.token}`)
  },
  component: TenantInviteClaim,
})

type Status =
  | { kind: "claiming" }
  | { kind: "joined"; tenant: ClaimedTenant }
  | { kind: "error"; reason: string }

function TenantInviteClaim() {
  const { t } = useTranslation()
  const { token } = Route.useParams()
  const [status, setStatus] = useState<Status>({ kind: "claiming" })

  useEffect(() => {
    const controller = new AbortController()

    // Effect-owned external call; the setState below is a sync from the
    // server, not a synchronous cascading render.
    void claimTenantInvitation(token, controller.signal).then(
      (result: TenantClaimResult) => {
        if (controller.signal.aborted) return

        if (!result.ok) {
          setStatus({ kind: "error", reason: result.reason })
          return
        }

        // Role only - no tenant id, no token. The venue is attributed with a
        // PostHog group where that matters; see identifyTenantGroup.
        track("tenant_invite_claimed", { role: roleBucket(result.tenant.role) })
        setStatus({ kind: "joined", tenant: result.tenant })
      }
    )

    return () => controller.abort()
  }, [token])

  if (status.kind === "claiming") {
    return <Card title={t("venue_invite.claiming")} />
  }

  if (status.kind === "error") {
    return (
      <Card
        title={t("venue_invite.error_title")}
        body={t(`venue_invite.error.${status.reason}`)}
        // Whatever went wrong, the wedding list is where this account's own
        // work is, and it is the only onward move that is right for every
        // reason - including PT409, where the fix is on another account.
        action={{
          href: `${apexOrigin()}/home`,
          label: t("venue_invite.error_cta"),
        }}
      />
    )
  }

  const { tenant } = status
  const isStaff = tenant.role === "owner" || tenant.role === "staff"

  return (
    <Card
      title={t("venue_invite.joined_title", { name: tenant.name })}
      body={t(
        isStaff ? "venue_invite.joined_staff" : "venue_invite.joined_customer"
      )}
      // Staff work in the CRM on the venue's own host; a couple plans on the
      // apex. Sessions are per-origin, so sending either to the other's origin
      // lands them on a sign-in screen for no reason - which is the whole
      // reason apexOrigin/tenantUrl exist rather than a SITE_ORIGIN
      // constant.
      action={{
        href: isStaff ? tenantUrl(tenant.slug, "/crm") : `${apexOrigin()}/home`,
        label: t(
          isStaff
            ? "venue_invite.joined_cta_staff"
            : "venue_invite.joined_cta_customer"
        ),
      }}
    />
  )
}

/** 'owner' never arrives from a claim - the CHECK forbids inviting one. */
const roleBucket = (role: ClaimedTenant["role"]): "staff" | "customer" =>
  role === "customer" ? "customer" : "staff"

function Card({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      {body ? <p className="max-w-md text-muted-foreground">{body}</p> : null}
      {action ? (
        <Button asChild>
          <a href={action.href}>{action.label}</a>
        </Button>
      ) : null}
    </div>
  )
}
