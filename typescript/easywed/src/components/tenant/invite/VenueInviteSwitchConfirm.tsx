import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/**
 * The PT412 question: this account is on another venue's list of couples, and
 * one account belongs to one venue.
 *
 * Asked, never assumed. Leaving a venue's list is the couple withdrawing a
 * disclosure (their display name, via `staff_can_view_profile`), so it is
 * theirs to confirm - and the copy says what it does *not* do: plans already
 * linked to the old venue stay linked, because that is a separate decision
 * made per plan (20260820000001 §3).
 *
 * `fromName` is null when the lookup of the current venue failed; the question
 * is still asked, just without the name.
 */
export const VenueInviteSwitchConfirm = ({
  fromName,
  toName,
  submitting,
  onConfirm,
  onCancel,
}: {
  fromName: string | null
  toName: string
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 text-left">
      <p className="font-medium">
        {fromName
          ? t("venue_invite.switch.title", { from: fromName })
          : t("venue_invite.switch.title_unnamed")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("venue_invite.switch.body", {
          from: fromName ?? t("venue_invite.switch.unnamed_venue"),
          to: toName,
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm} disabled={submitting}>
          {t("venue_invite.switch.confirm")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  )
}
