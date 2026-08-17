import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { VenueLinkStep } from "./VenueLinkStep"
import { VenueStatusStep } from "./VenueStatusStep"
import { VenueGrantStep } from "./VenueGrantStep"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

/**
 * The couple's whole relationship with their venue, in one dialog: link it,
 * grant it, revoke it.
 *
 * An orchestrator over three steps rather than one component, following the
 * shape the guest import wizard already established. The steps are not a
 * sequence though - which one renders is derived from server state
 * (`venue`/`venueAccess`), so a couple who granted access in another tab and
 * reopens this sees the revoke button, not a stale form.
 *
 * Owner-only, and gated twice: the button that opens it is only rendered for an
 * owner, and both RPCs behind these steps check `weddings.owner_id` themselves.
 * Linking and granting are disclosure decisions about the couple's guests, not
 * planning edits, so an editor is deliberately not offered them.
 */
export const VenueAccessDialog = () => {
  const { t } = useTranslation()

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )

  const { weddingId, venue, venueAccess } = useGlobalStore(
    useShallow((state) => ({
      weddingId: state.weddingId,
      venue: state.venue,
      venueAccess: state.venueAccess,
    }))
  )

  const isOpen = dialog.opened === "Wedding.Venue"

  // The consent screen is a transient step, not a state of the wedding: closing
  // the dialog on it and reopening must land back on the status, so that an
  // accidental second open never reads as a second request for consent. No
  // reset is needed for that - DialogManager renders this component only while
  // `opened` names it, so closing unmounts it and the state goes with it.
  const [confirming, setConfirming] = useState(false)

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) dialog.close()
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("venue.dialog.title")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("venue.dialog.summary")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {!weddingId ? null : !venue ? (
            <VenueLinkStep weddingId={weddingId} />
          ) : confirming ? (
            <VenueGrantStep
              weddingId={weddingId}
              venue={venue}
              onDone={() => setConfirming(false)}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <VenueStatusStep
              weddingId={weddingId}
              venue={venue}
              access={venueAccess}
              onGrantRequested={() => setConfirming(true)}
            />
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
