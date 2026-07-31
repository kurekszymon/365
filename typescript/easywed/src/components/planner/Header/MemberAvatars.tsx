import { useTranslation } from "react-i18next"
import { UserPlusIcon } from "lucide-react"
import { MemberAvatar } from "./MemberAvatar"
import { useGlobalStore } from "@/stores/global.store"
import { useAuthStore } from "@/stores/auth.store"
import { useDialogStore } from "@/stores/dialog.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Past this the stack starts eating the header on mobile; the rest collapse
// into a +N chip that opens the full list.
const MAX_VISIBLE = 4

/**
 * Who else is in this wedding. Shown to every role, not just owners: an editor
 * moving tables around should be able to see at a glance that someone else can
 * be doing the same thing. Reads the member list loaded with the wedding, so
 * it costs no extra request.
 */
export const MemberAvatars = () => {
  const { t } = useTranslation()

  const members = useGlobalStore((state) => state.members)
  const role = useGlobalStore((state) => state.role)
  const currentUserId = useAuthStore((state) => state.session?.user.id)
  const openDialog = useDialogStore((state) => state.open)

  // Empty in guest mode (a local wedding has no members table behind it), and
  // a solo planner has nobody to be aware of - in both cases the stack is
  // noise, but the owner still needs a way in to invite someone.
  if (members.length < 2 && role !== "owner") return null

  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.slice(MAX_VISIBLE)

  return (
    <button
      type="button"
      onClick={() => openDialog("Wedding.Members")}
      aria-label={t("members.title")}
      className="flex items-center rounded-full pl-2 transition-opacity hover:opacity-80"
    >
      {visible.map((member) => (
        <span key={member.userId} className="-ml-2">
          <MemberAvatar
            member={member}
            isCurrentUser={member.userId === currentUserId}
          />
        </span>
      ))}

      {overflow.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="-ml-2 flex h-7 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground ring-2 ring-background">
              +{overflow.length}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {overflow
              .map(
                (member) =>
                  member.displayName ?? t(`members.role.${member.role}`)
              )
              .join(", ")}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Owners keep an explicit invite affordance - the dialog behind the
          stack is the same one, but a stack of faces doesn't say "add". */}
      {role === "owner" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 bg-background text-muted-foreground ring-2 ring-background">
              <UserPlusIcon className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("members.invite")}</TooltipContent>
        </Tooltip>
      )}
    </button>
  )
}
