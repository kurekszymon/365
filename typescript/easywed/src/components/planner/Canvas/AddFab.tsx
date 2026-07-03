import { PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Persistent circular primary action on the mobile full-screen plan. Opens
 * the "Dodaj do sali" preset-card picker as a bottom sheet.
 */
export const AddFab = () => {
  const { t } = useTranslation()
  const openAddHub = usePanelStore((state) => state.openAddHub)

  return (
    <button
      type="button"
      data-no-pan
      onClick={() => openAddHub()}
      aria-label={t("hall.add_hub.title")}
      className="absolute right-4 bottom-32 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_28px_-10px_var(--color-primary)]"
    >
      <PlusIcon className="size-7" />
    </button>
  )
}
