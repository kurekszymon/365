import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { WeddingRowMenu } from "./WeddingRowMenu"

export type WeddingSummary = {
  id: string
  name: string
  isOwner: boolean
}

interface WeddingListItemProps {
  wedding: WeddingSummary
  onDelete: (wedding: WeddingSummary) => void
  onLeave: (wedding: WeddingSummary) => void
}

export const WeddingListItem = ({
  wedding,
  onDelete,
  onLeave,
}: WeddingListItemProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 rounded-md border bg-card pr-1 text-sm hover:bg-accent">
      <Link
        to="/wedding/$id"
        params={{ id: wedding.id }}
        className="min-w-0 flex-1 truncate p-3"
      >
        {wedding.name || t("wedding")}
      </Link>
      <WeddingRowMenu
        isOwner={wedding.isOwner}
        onDelete={() => onDelete(wedding)}
        onLeave={() => onLeave(wedding)}
      />
    </div>
  )
}
