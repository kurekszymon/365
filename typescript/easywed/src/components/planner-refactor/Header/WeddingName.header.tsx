import { useTranslation } from "react-i18next"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

export const WeddingName = () => {
  const { t } = useTranslation()

  const openDialog = useDialogStore((state) => state.open)
  const name = useGlobalStore((state) => state.name)

  return (
    <button
      className="max-w-[140px] truncate text-sm font-semibold underline-offset-2 hover:underline sm:max-w-none"
      onClick={() => {
        openDialog("Wedding.Rename")
      }}
      title={t("wedding.rename")}
    >
      {name}
    </button>
  )
}
