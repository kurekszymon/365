import { FileBoxIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDialogStore } from "@/stores/dialog.store"

export const ImportHeader = () => {
  const { t } = useTranslation()
  const open = useDialogStore((s) => s.open)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label={t("import")}>
              <UploadIcon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("import")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-auto min-w-0">
        <DropdownMenuItem onClick={() => open("Guest.Import")}>
          <FileSpreadsheetIcon />
          {t("import.format.guests")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("Planner.Import.Dxf")}>
          <FileBoxIcon />
          {t("import.format.cad")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
