import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { LinkedVenue } from "@/stores/global.store"
import type { MyVenueMembershipResult } from "@/lib/sync/tenant"
import { Button } from "@/components/ui/button"
import { fetchMyVenueMembership } from "@/lib/sync/tenant"
import { linkWeddingToVenue } from "@/lib/sync/venue"
import { track } from "@/lib/analytics/track"
import { useAuthStore } from "@/stores/auth.store"

/**
 * Step one: point the wedding at the couple's venue.
 *
 * There is no slug field, and that follows from the data rather than taste.
 * Venues link by invitation (`open_linking` off), so `link_wedding_to_venue`
 * accepts exactly the venues this account is a member of - and
 * `tenant_members_one_per_user` makes that at most one. A free-text field had
 * one right answer for a couple on a venue's list and none for anyone else, who
 * could only type their way to PT403. So the step reads the membership and
 * offers it by name, or says how to get one: open the venue's invitation link.
 * The open-linking branch still exists in the database; nothing here reaches
 * it.
 *
 * Grants nothing. `link_wedding_to_venue` lands the wedding in `pending`, which
 * the venue cannot see at all - the consent decision happens in VenueGrantStep.
 *
 * Changing venue arrives here too (`replacing`). When the membership *is* the
 * venue being replaced there is nothing to link: moving to another venue means
 * joining its list, which only its invitation link can do - and that page
 * offers the switch itself.
 */
export const VenueLinkStep = ({
  weddingId,
  replacing = null,
  onLinked,
  onCancel,
}: {
  weddingId: string
  /**
   * The venue being replaced, when this is a change rather than a first link.
   * Used to say what is about to be lost, and to notice when the only venue on
   * offer is the one already linked.
   */
  replacing?: LinkedVenue | null
  onLinked?: () => void
  /** Only offered on a change - a first link has nothing to go back to. */
  onCancel?: () => void
}) => {
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.session?.user.id)

  const [membership, setMembership] = useState<MyVenueMembershipResult | null>(
    null
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()

    // An external read resolving into state, not a cascading render.
    void fetchMyVenueMembership(userId, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setMembership(result)
    })

    return () => controller.abort()
  }, [userId, reloadKey])

  const cancel = onCancel ? (
    <Button
      type="button"
      variant="ghost"
      disabled={submitting}
      onClick={onCancel}
    >
      {t("common.cancel")}
    </Button>
  ) : null

  if (!membership) {
    return (
      <p className="text-sm text-muted-foreground">{t("venue.link.loading")}</p>
    )
  }

  if (!membership.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">
          {t("venue.link.load_failed")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMembership(null)
              setReloadKey((k) => k + 1)
            }}
          >
            {t("common.try_again")}
          </Button>
          {cancel}
        </div>
      </div>
    )
  }

  const venue = membership.membership

  if (!venue || venue.slug === replacing?.slug) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          {venue
            ? t("venue.link.change_via_invite", { name: venue.name })
            : t("venue.link.no_invite")}
        </p>
        {cancel ? (
          <div className="flex flex-wrap items-center gap-2">{cancel}</div>
        ) : null}
      </div>
    )
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)

    const result = await linkWeddingToVenue(weddingId, venue.slug)

    setSubmitting(false)
    if (result.ok) {
      track("venue_access_requested", { source: "couple" })
      onLinked?.()
      return
    }
    setError(t(`venue.link.error.${result.reason}`))
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {t("venue.link.member_of", { name: venue.name })}
      </p>

      {replacing ? (
        <p className="text-sm text-muted-foreground">
          {t("venue.link.replacing", { name: replacing.name })}
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={submitting} onClick={() => void submit()}>
          {t("venue.link.submit_named", { name: venue.name })}
        </Button>
        {cancel}
      </div>
    </div>
  )
}
