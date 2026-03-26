import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { useDialogStore } from "@/stores/dialog"
import { useGlobalStore } from "@/stores/global"

export const RenameWeddingDialog = () => {
  const { t } = useTranslation()
  const { name, setName } = useGlobalStore(
    useShallow((state) => ({
      name: state.name,
      setName: state.setName,
    }))
  )

  const [localName, setLocalName] = useState(name)

  const dialog = useDialogStore(
    useShallow((state) => ({
      open: state.open,
      close: state.close,
      opened: state.opened,
    }))
  )

  const handleClose = () => {
    dialog.close()
    setLocalName(name)
  }

  const handleSave = () => {
    dialog.close()
    setName(localName)
  }

  return (
    <Dialog
      open={dialog.opened === "RenameWedding"}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      {/* aria-describedby={undefined} to suppres radix warnings */}
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("wedding.rename")}</DialogTitle>
        </DialogHeader>
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!localName.trim() || localName === name}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
