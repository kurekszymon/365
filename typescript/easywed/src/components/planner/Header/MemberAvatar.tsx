import { UserIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { WeddingMember } from "@/stores/global.store"
import { getAvatarTone, getInitials } from "@/lib/memberIdentity"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface MemberAvatarProps {
  member: WeddingMember
  isCurrentUser: boolean
}

/**
 * One circle in the header stack. A member who hasn't set a display name gets
 * a neutral person glyph and is identified by role alone - we deliberately
 * have nothing else to show, and inventing initials from an email would be
 * exactly the leak the profiles table avoids.
 */
export const MemberAvatar = ({ member, isCurrentUser }: MemberAvatarProps) => {
  const { t } = useTranslation()

  const roleLabel = t(`members.role.${member.role}`)
  const name = member.displayName ?? roleLabel

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-background select-none",
            member.displayName
              ? getAvatarTone(member.userId)
              : "bg-muted text-muted-foreground"
          )}
        >
          {member.displayName ? (
            getInitials(member.displayName)
          ) : (
            <UserIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-medium">
          {isCurrentUser ? t("members.you") : name}
        </span>
        {/* Redundant for an unnamed member, whose name *is* the role. */}
        {(member.displayName || isCurrentUser) && (
          <span className="text-muted-foreground"> · {roleLabel}</span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
