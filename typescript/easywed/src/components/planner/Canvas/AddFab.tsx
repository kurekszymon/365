import { PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Persistent circular primary action on the mobile full-screen plan. Opens
 * table/fixture creation — stands in for the desktop sidebar's "+ Dodaj" tab
 * until the visual preset-card picker (Phase 5) replaces this direct route.
 */
export const AddFab = () => {
  const { t } = useTranslation()
  const openTableAdd = usePanelStore((state) => state.openTableAdd)

  return (
    <button
      type="button"
      data-no-pan
      onClick={() => openTableAdd()}
      aria-label={t("hall.add_hub.title")}
      className="absolute right-4 bottom-32 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_28px_-10px_var(--color-primary)]"
    >
      <PlusIcon className="size-6.5" />
    </button>
  )
}
