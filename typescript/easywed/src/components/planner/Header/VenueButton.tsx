import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { Building2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"
import { isLocalWedding } from "@/lib/localWedding"

/**
 * The couple's way into the venue link and the consent dialog.
 *
 * Owner-only, matching both RPCs behind the dialog: linking a wedding to a
 * venue and granting that venue access are disclosure decisions about the
 * couple's guests, not planning edits, so an editor is not offered them.
 *
 * Hidden in guest mode. A local wedding has no row to link, and
 * `link_wedding_to_venue` takes a real wedding id - offering the button there
 * would be offering something that cannot work.
 *
 * The dot is the whole status indicator: `pending` means the couple attached a
 * venue and never came back to decide, which is a state worth a nudge, and
 * `granted` means data is leaving - both deserve to be visible from the header
 * without opening anything.
 */
export const VenueButton = () => {
  const { t } = useTranslation()
  const openDialog = useDialogStore((state) => state.open)

  const { weddingId, role, venueAccess } = useGlobalStore(
    useShallow((state) => ({
      weddingId: state.weddingId,
      role: state.role,
      venueAccess: state.venueAccess,
    }))
  )

  if (role !== "owner") return null
  if (!weddingId || isLocalWedding(weddingId)) return null

  const label = t("venue.header_button")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          aria-label={label}
          onClick={() => openDialog("Wedding.Venue")}
        >
          <Building2Icon />
          {venueAccess !== "none" && (
            <span
              aria-hidden="true"
              className={
                venueAccess === "granted"
                  ? "h-1.5 w-1.5 rounded-full bg-primary"
                  : "h-1.5 w-1.5 rounded-full bg-muted-foreground"
              }
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
