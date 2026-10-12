import { useTranslation } from "react-i18next"
import { VenueInviteCard } from "./VenueInviteCard"
import { VenueInviteSwitchConfirm } from "./VenueInviteSwitchConfirm"
import { VenueInviteWeddingPicker } from "./VenueInviteWeddingPicker"
import { useCustomerInviteAccept } from "./useCustomerInviteAccept"
import type { TenantInvitePreview } from "@/lib/sync/tenant"
import { Button } from "@/components/ui/button"

/**
 * A signed-in couple holding a customer invitation, on the apex: pick a plan,
 * accept, and land in it with the venue dialog open.
 *
 * Nothing is spent until "Accept": claiming on load would let the wrong
 * partner burn a link they could never use. The orchestration
 * lives in `useCustomerInviteAccept`; this only lays the pieces out.
 */
export const VenueInviteCustomerAccept = ({
  token,
  userId,
  preview,
}: {
  token: string
  userId: string
  preview: TenantInvitePreview
}) => {
  const { t } = useTranslation()
  const { tenant } = preview
  const accept = useCustomerInviteAccept({
    token,
    userId,
    venueSlug: tenant.slug,
  })

  const title = t("venue_invite.preview_title_customer", { name: tenant.name })

  if (accept.loading) {
    return <VenueInviteCard tenant={tenant} title={title} />
  }

  if (accept.loadFailed) {
    return (
      <VenueInviteCard
        tenant={tenant}
        title={title}
        body={t("venue_invite.accept.load_failed")}
      >
        <Button onClick={accept.retryLoad}>{t("common.try_again")}</Button>
      </VenueInviteCard>
    )
  }

  return (
    <VenueInviteCard
      tenant={tenant}
      title={title}
      body={t("venue_invite.accept.body")}
    >
      <VenueInviteWeddingPicker
        owned={accept.owned}
        hasShared={accept.hasShared}
        selection={accept.selection}
        venueSlug={tenant.slug}
        venueName={tenant.name}
        disabled={accept.submitting || accept.switchFrom !== null}
        onPick={accept.pick}
      />

      {accept.replacing ? (
        <p className="text-left text-sm text-muted-foreground">
          {t("venue.link.replacing", { name: accept.replacing.name })}
        </p>
      ) : null}

      {accept.error ? (
        <p className="text-left text-sm text-destructive">
          {t(`venue_invite.accept.error.${accept.error}`)}
        </p>
      ) : null}

      {accept.switchFrom ? (
        <VenueInviteSwitchConfirm
          fromName={accept.switchFrom.name}
          toName={tenant.name}
          submitting={accept.submitting}
          onConfirm={() => void accept.submit(true)}
          onCancel={accept.cancelSwitch}
        />
      ) : (
        <Button
          onClick={() => void accept.submit()}
          disabled={accept.submitting}
        >
          {t("venue_invite.accept.submit")}
        </Button>
      )}

      <p className="text-left text-xs text-muted-foreground">
        {t("venue_invite.accept.consent_note")}
      </p>
    </VenueInviteCard>
  )
}
