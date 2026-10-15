import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { VenueInviteCard } from "./VenueInviteCard"
import type { TenantInvitePreview } from "@/lib/sync/tenant"
import { Button } from "@/components/ui/button"

/**
 * A signed-out visitor holding a live invitation.
 *
 * Shown instead of bouncing straight to /login, so the first thing a couple
 * sees is *who* is inviting them. Both doors carry `next` back here, and the
 * existing auth plumbing keeps it through email confirmation and
 * /accept-terms - nothing is claimed until they return and click.
 *
 * Sign-up first: most couples arriving from a venue's link have no account yet.
 */
export const VenueInviteSignIn = ({
  token,
  preview,
}: {
  token: string
  preview: TenantInvitePreview
}) => {
  const { t } = useTranslation()
  const next = `/venue/invite/${token}`
  const isStaff = preview.role === "staff"

  return (
    <VenueInviteCard
      tenant={preview.tenant}
      title={t(
        isStaff
          ? "venue_invite.preview_title_staff"
          : "venue_invite.preview_title_customer",
        { name: preview.tenant.name }
      )}
      body={t(
        isStaff
          ? "venue_invite.preview_body_staff"
          : "venue_invite.preview_body_customer"
      )}
    >
      <Button asChild>
        <Link to="/signup" search={{ next }}>
          {t("auth.sign_up")}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/login" search={{ next }}>
          {t("auth.sign_in")}
        </Link>
      </Button>
    </VenueInviteCard>
  )
}
