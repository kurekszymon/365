import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDialogStore } from "@/stores/dialog.store"

export const ExportHeader = () => {
  const { t } = useTranslation()
  const open = useDialogStore((s) => s.open)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <DownloadIcon />
          <span className="hidden md:inline">{t("export")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-0">
        <DropdownMenuItem onClick={() => open("Guests.Export.Csv")}>
          <FileSpreadsheetIcon />
          {t("export.format.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("Guests.Export.Pdf")}>
          <FileTextIcon />
          {t("export.format.pdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
