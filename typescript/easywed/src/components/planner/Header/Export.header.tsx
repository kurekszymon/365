import { DownloadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"

export const ExportHeader = () => {
  const { t } = useTranslation()
  const open = useDialogStore((s) => s.open)

  return (
    <Button variant="outline" onClick={() => open("Guests.Export.Csv")}>
      <DownloadIcon />
      <span className="hidden md:inline">{t("export")}</span>
    </Button>
  )
}
