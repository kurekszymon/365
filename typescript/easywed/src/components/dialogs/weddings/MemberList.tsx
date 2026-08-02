import { useTranslation } from "react-i18next"
import { UserXIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

import type { MemberAccess } from "./useWeddingMembers"
import { Button } from "@/components/ui/button"

interface MemberListProps {
  members: Array<MemberAccess>
  currentUserId: string | undefined
  // Owners only. Editors and viewers see the same list without the controls.
  canManage: boolean
  onRemoveAccess: (member: MemberAccess) => void
}

export const MemberList = ({
  members,
  currentUserId,
  canManage,
  onRemoveAccess,
}: MemberListProps) => {
  const { t } = useTranslation()

  if (members.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {t("members.active")}
      </p>
      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId

          return (
            <li
              key={member.user_id}
              className="flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {getMemberLabel(member, isCurrentUser, t)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`members.role.${member.role}`)}
                </span>
              </div>

              {/* The one place a nameless member is told they're nameless -
                  and it's their own row, so it's actionable. */}
              {isCurrentUser && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/settings">
                    {member.display_name
                      ? t("members.change_name")
                      : t("members.set_name")}
                  </Link>
                </Button>
              )}

              {canManage && member.role !== "owner" && !isCurrentUser && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveAccess(member)}
                  aria-label={t("members.remove_access")}
                >
                  <UserXIcon />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * A member who hasn't set a display name is shown by role, not by a slice of
 * their user id - the id was never meaningful to a human, and their email is
 * deliberately not available here (see the profiles migration).
 */
function getMemberLabel(
  member: MemberAccess,
  isCurrentUser: boolean,
  t: (key: string) => string
) {
  if (member.display_name) {
    return isCurrentUser
      ? `${member.display_name} (${t("members.you")})`
      : member.display_name
  }

  return isCurrentUser ? t("members.you") : t(`members.role.${member.role}`)
}
