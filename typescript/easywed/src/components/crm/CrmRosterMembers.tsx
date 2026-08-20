import { useTranslation } from "react-i18next"
import { TrashIcon } from "lucide-react"

import type { TenantMember } from "./useTenantRoster"
import { Button } from "@/components/ui/button"

/**
 * Who belongs to this venue.
 *
 * The display names come from `profiles`, readable here only because
 * `staff_can_view_profile` keys off the very `tenant_members` rows this list
 * renders - which is why those rows have to be created by their subject through
 * `claim_tenant_invitation` and not by the venue. A name with no row is a name
 * the venue was never given.
 *
 * `owner` rows carry no remove button because both DELETE policies in the
 * database exclude them; retiring a venue is a provisioning operation.
 * Everyone else, including the caller's own row, can go - a staff member
 * removing themselves is a resignation, and it is one-way.
 */
export const CrmRosterMembers = ({
  members,
  currentUserId,
  onRemove,
}: {
  members: Array<TenantMember>
  currentUserId: string | undefined
  onRemove: (member: TenantMember) => void
}) => {
  const { t } = useTranslation()

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("crm.roster.members_empty")}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => (
        <li
          key={member.user_id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              {/* Falls back to the role rather than to a uuid: a missing name
                  is the normal state for someone who never set one, and the
                  uuid tells the reader nothing. */}
              {member.display_name ?? t(`crm.role.${member.role}`)}
              {member.user_id === currentUserId
                ? ` ${t("crm.roster.you")}`
                : ""}
            </span>
            <span className="text-sm text-muted-foreground">
              {t(`crm.role.${member.role}`)}
            </span>
          </div>

          {member.role === "owner" ? null : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(member)}
              aria-label={t("crm.roster.remove")}
            >
              <TrashIcon />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
