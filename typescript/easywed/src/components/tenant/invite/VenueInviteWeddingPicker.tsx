import { useTranslation } from "react-i18next"
import { NEW_WEDDING } from "./useCustomerInviteAccept"
import type { InviteWedding } from "@/lib/sync/tenant"
import { cn } from "@/lib/utils"

/**
 * Which plan to link: one of the caller's own, or a new one.
 *
 * Native radios in labels rather than a custom listbox - there is no radio
 * group in components/ui, and this needs nothing a fieldset does not already
 * give keyboard and screen-reader users.
 *
 * Only owned plans are listed, because only the owner can link
 * (`link_wedding_to_venue`). A plan shared with this account is not hidden
 * silently: `hasShared` adds the sentence that tells them who can.
 */
export const VenueInviteWeddingPicker = ({
  owned,
  hasShared,
  selection,
  venueSlug,
  venueName,
  disabled,
  onPick,
}: {
  owned: Array<InviteWedding>
  hasShared: boolean
  selection: string
  venueSlug: string
  venueName: string
  disabled: boolean
  onPick: (id: string) => void
}) => {
  const { t } = useTranslation()

  const options = [
    ...owned.map((w) => ({
      id: w.id,
      label: w.name,
      note:
        w.venue?.slug === venueSlug
          ? t("venue_invite.accept.already_linked", { name: venueName })
          : w.venue
            ? t("venue_invite.accept.linked_elsewhere", { name: w.venue.name })
            : null,
    })),
    {
      id: NEW_WEDDING,
      label: t("venue_invite.accept.new_wedding"),
      note: null,
    },
  ]

  return (
    <fieldset className="flex flex-col gap-2 text-left" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">
        {t("venue_invite.accept.pick_legend")}
      </legend>

      {options.map((option) => (
        <label
          key={option.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-md border p-3",
            selection === option.id && "border-primary bg-accent"
          )}
        >
          <input
            type="radio"
            name="venue-invite-wedding"
            value={option.id}
            checked={selection === option.id}
            onChange={() => onPick(option.id)}
            className="mt-1"
          />
          <span className="flex flex-col">
            <span className="font-medium">{option.label}</span>
            {option.note ? (
              <span className="text-sm text-muted-foreground">
                {option.note}
              </span>
            ) : null}
          </span>
        </label>
      ))}

      {hasShared ? (
        <p className="text-sm text-muted-foreground">
          {t("venue_invite.accept.shared_hint")}
        </p>
      ) : null}
    </fieldset>
  )
}
