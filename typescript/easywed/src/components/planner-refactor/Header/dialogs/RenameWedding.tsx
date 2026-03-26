import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDialogStore } from "@/stores/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useGlobalStore } from "@/stores/global"

export const RenameWeddingDialog = () => {
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
    setLocalName(name)
    dialog.close()
  }

  const handleSave = () => {
    setName(localName)
    dialog.close()
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
          <DialogTitle>Rename wedding</DialogTitle>
        </DialogHeader>
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!localName.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
