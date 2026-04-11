import { useTranslation } from "react-i18next"
import { GuestAssignmentPicker } from "./GuestAssignmentPicker"
import { TableCapacityField } from "./TableCapacityField"
import { TableNameField } from "./TableNameField"
import { TableShapeField } from "./TableShapeField"
import type { TableShape } from "@/stores/planner.store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface TableDialogProps {
  opened: boolean
  title: string
  name: string
  shape: TableShape
  capacity: number
  assignedGuestIds: Array<string>
  shapeFields: React.ReactNode
  canSubmit: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onShapeChange: (value: TableShape) => void
  onCapacityChange: (value: number) => void
  onAssignedGuestIdsChange: (ids: Array<string>) => void
  onSave: () => void
}

export const TableDialog = ({
  opened,
  title,
  name,
  shape,
  capacity,
  assignedGuestIds,
  shapeFields,
  canSubmit,
  onOpenChange,
  onNameChange,
  onShapeChange,
  onCapacityChange,
  onAssignedGuestIdsChange,
  onSave,
}: TableDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog
      open={opened}
      onOpenChange={onOpenChange}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogTitle>{title}</DialogTitle>

        <TableNameField value={name} onChange={onNameChange} />

        <TableShapeField value={shape} onChange={onShapeChange} />

        {shapeFields}

        <TableCapacityField value={capacity} onChange={onCapacityChange} />

        <GuestAssignmentPicker
          capacity={capacity}
          assignedGuestIds={assignedGuestIds}
          onAssignedGuestIdsChange={onAssignedGuestIdsChange}
        />

        <Button disabled={!canSubmit} onClick={onSave}>
          {t("common.save")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
