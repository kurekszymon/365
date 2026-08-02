import { LogOutIcon, MoreVerticalIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface WeddingRowMenuProps {
  isOwner: boolean
  onDelete: () => void
  onLeave: () => void
}

/**
 * The two ways out of a wedding, which one you get depends on whose it is:
 * owners delete it for everyone, invited members just drop their own access.
 */
export const WeddingRowMenu = ({
  isOwner,
  onDelete,
  onLeave,
}: WeddingRowMenuProps) => {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("weddings.actions")}>
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        {isOwner ? (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon />
            {t("weddings.delete")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onSelect={onLeave}>
            <LogOutIcon />
            {t("weddings.leave")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
