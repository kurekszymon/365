import { useTranslation } from "react-i18next"

interface ShowMoreButtonProps {
  count: number
  onClick: () => void
}

export const ShowMoreButton = ({ count, onClick }: ShowMoreButtonProps) => {
  const { t } = useTranslation()

  return (
    <button
      className="w-full px-2 py-1.5 text-center text-xs text-muted-foreground italic hover:bg-muted/50 hover:text-foreground"
      onClick={onClick}
    >
      {t("common.show_more", { count })}
    </button>
  )
}
