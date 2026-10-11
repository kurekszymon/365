import { useTranslation } from "react-i18next"

import type { AcceptedInvitation } from "./useTenantRoster"

/**
 * Invitations someone has accepted: the label staff gave the link, who
 * accepted it and when.
 *
 * This is the venue's signal that a couple said yes. Their wedding stays out
 * of the CRM until they grant access - a `pending` link is invisible to the
 * venue by design (20260817000003) - so without this list a venue that sent a
 * link hears nothing back at all.
 *
 * Read-only: a spent token can be neither copied nor revoked, and removing the
 * person is a membership change, made in the list below.
 *
 * A claimer who has since left is shown as having left, not by name. The name
 * reached the venue through current membership (`staff_can_view_profile`), and
 * leaving withdrew it.
 */
export const CrmRosterAccepted = ({
  invitations,
}: {
  invitations: Array<AcceptedInvitation>
}) => {
  const { t, i18n } = useTranslation()

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("crm.roster.accepted_empty")}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {invitations.map((invitation) => {
        const date = new Date(invitation.claimed_at).toLocaleDateString(
          i18n.language
        )
        const { claimer } = invitation

        return (
          <li
            key={invitation.id}
            className="flex flex-col gap-1 rounded-md border p-3 text-sm"
          >
            <span className="truncate font-medium">
              {invitation.label ?? t(`crm.role.${invitation.role}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              {invitation.label ? `${t(`crm.role.${invitation.role}`)} · ` : ""}
              {claimer.onRoster
                ? t("crm.roster.accepted_by", {
                    name: claimer.name ?? t("crm.roster.accepted_unnamed"),
                    date,
                  })
                : t("crm.roster.accepted_left", { date })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
