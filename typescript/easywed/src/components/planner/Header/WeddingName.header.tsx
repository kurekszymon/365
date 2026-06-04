import { PencilIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

export const WeddingName = () => {
  const { t } = useTranslation()

  const openDialog = useDialogStore((state) => state.open)
  const name = useGlobalStore((state) => state.name)

  return (
    <button
      className="flex max-w-[140px] items-center gap-1 truncate text-sm font-semibold underline-offset-2 hover:underline sm:max-w-none"
      onClick={() => {
        openDialog("Wedding.Rename")
      }}
      title={t("wedding.rename")}
    >
      {name}
      <PencilIcon className="size-3 shrink-0 opacity-40" />
    </button>
  )
}
