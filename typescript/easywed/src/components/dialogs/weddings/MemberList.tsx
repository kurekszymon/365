import { useTranslation } from "react-i18next"
import { UserXIcon } from "lucide-react"

import type { MemberAccess } from "./useWeddingMembers"
import { Button } from "@/components/ui/button"

interface MemberListProps {
  members: Array<MemberAccess>
  currentUserId: string | undefined
  onRemoveAccess: (member: MemberAccess) => void
}

export const MemberList = ({
  members,
  currentUserId,
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
        {members.map((member) => (
          <li
            key={member.user_id}
            className="flex items-center gap-2 rounded-md border p-2 text-sm"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">
                {getMemberLabel(member, currentUserId, t)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`members.role.${member.role}`)}
              </span>
            </div>
            {member.role !== "owner" && member.user_id !== currentUserId && (
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
        ))}
      </ul>
    </div>
  )
}

function getMemberLabel(
  member: MemberAccess,
  currentUserId: string | undefined,
  t: (key: string) => string
) {
  if (member.user_id === currentUserId) {
    return t("members.you")
  }

  return `${t("members.member")} ${member.user_id.slice(0, 8)}`
}
