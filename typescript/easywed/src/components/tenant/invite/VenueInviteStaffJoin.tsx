import { useState } from "react"
import { useTranslation } from "react-i18next"
import { VenueInviteCard } from "./VenueInviteCard"
import type {
  ClaimedTenant,
  TenantClaimResult,
  TenantInvitePreview,
} from "@/lib/sync/tenant"
import { claimTenantInvitation } from "@/lib/sync/tenant"
import { tenantUrl } from "@/lib/tenant/host"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"

type Status =
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "joined"; tenant: ClaimedTenant }
  | {
      kind: "error"
      reason: Extract<TenantClaimResult, { ok: false }>["reason"]
    }

/**
 * A signed-in visitor holding a staff invitation, on the venue's own host
 * (the page hops there first - see inviteOrigin.ts).
 *
 * The claim waits for the button. A `tenant_members` row hands the venue this
 * person's display name and opens the whole CRM to them; that is a decision,
 * and opening a URL is not one.
 *
 * The result can still say "customer": an account that is already this
 * venue's customer keeps its role (`claim_tenant_invitation` never changes an
 * existing row), so the card follows the role that came back, not the one the
 * link advertised.
 */
export const VenueInviteStaffJoin = ({
  token,
  preview,
}: {
  token: string
  preview: TenantInvitePreview
}) => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  const join = async () => {
    setStatus({ kind: "joining" })
    const result = await claimTenantInvitation(token)

    if (!result.ok) {
      setStatus({ kind: "error", reason: result.reason })
      return
    }

    // Role only - no tenant id, no token. See identifyTenantGroup.
    track("tenant_invite_claimed", {
      role: result.tenant.role === "customer" ? "customer" : "staff",
    })
    setStatus({ kind: "joined", tenant: result.tenant })
  }

  if (status.kind === "joined") {
    const isStaff = status.tenant.role !== "customer"
    return (
      <VenueInviteCard
        tenant={preview.tenant}
        title={t("venue_invite.joined_title", { name: status.tenant.name })}
        body={t(
          isStaff
            ? "venue_invite.joined_staff"
            : "venue_invite.joined_staff_was_customer"
        )}
      >
        {isStaff ? (
          <Button asChild>
            <a href={tenantUrl(status.tenant.slug, "/crm")}>
              {t("venue_invite.joined_cta_staff")}
            </a>
          </Button>
        ) : null}
      </VenueInviteCard>
    )
  }

  return (
    <VenueInviteCard
      tenant={preview.tenant}
      title={t("venue_invite.preview_title_staff", {
        name: preview.tenant.name,
      })}
      body={t("venue_invite.staff_join_body")}
    >
      {status.kind === "error" ? (
        <p className="text-sm text-destructive">
          {/* `name` for `error.suspended`, the one reason whose sentence names
              the venue; the other reasons' strings ignore it. Reachable even
              though the page checks the preview's status first - a venue can
              be suspended between the preview and the click. */}
          {t(`venue_invite.error.${status.reason}`, {
            name: preview.tenant.name,
          })}
        </p>
      ) : null}
      <Button onClick={() => void join()} disabled={status.kind === "joining"}>
        {t("venue_invite.staff_join_cta")}
      </Button>
    </VenueInviteCard>
  )
}
