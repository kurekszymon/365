import { useShallow } from "zustand/react/shallow"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RectangularTable } from "./TableRectDimensionsField"
import { RoundTable } from "./TableRoundDimensionsField"
import { GuestAssignmentPicker } from "./GuestAssignmentPicker"
import { getSizeForShape, isDimensionsValidForShape } from "./utils"
import { TableNameField } from "./TableNameField"
import { TableShapeField } from "./TableShapeField"
import { TableCapacityField } from "./TableCapacityField"
import type { ReactNode } from "react"
import type { TableShape } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { useDialogStore } from "@/stores/dialog.store"

const INITIAL_VALUES = {
  name: "",
  shape: "rectangular" as TableShape,
  capacity: "8",
  width: "2",
  height: "1",
  assignedGuestIds: [] as Array<string>,
}
export const AddTableDialog = () => {
  const { t } = useTranslation()
  const [form, setForm] = useState(INITIAL_VALUES)

  const resetForm = () => setForm(INITIAL_VALUES)

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      meta: state.meta,
      close: state.close,
    }))
  )

  const planner = usePlannerStore(
    useShallow((state) => ({
      addTable: state.addTable,
      hall: state.hall,
    }))
  )

  const width = Number.parseFloat(form.width)
  const height = Number.parseFloat(form.height)
  const capacity = Number.parseInt(form.capacity, 10)
  const hallMaxWidth = planner.hall.dimensions.width
  const hallMaxHeight = planner.hall.dimensions.height

  const isDimensionsValid = isDimensionsValidForShape(form.shape, width, height)
  const isCapacityValid = Number.isInteger(capacity) && capacity > 0
  const isWidthOutOfBounds = Number.isFinite(width) && width > hallMaxWidth
  const isHeightOutOfBounds = Number.isFinite(height) && height > hallMaxHeight
  const isWithinHallBounds =
    form.shape === "round"
      ? width <= hallMaxWidth && width <= hallMaxHeight
      : width <= hallMaxWidth && height <= hallMaxHeight

  const normalizedCapacity = isCapacityValid ? capacity : 0

  const assignedGuestIdsWithinCapacity = form.assignedGuestIds.slice(
    0,
    normalizedCapacity
  )

  const canSave =
    !!form.name.trim() &&
    isDimensionsValid &&
    isCapacityValid &&
    isWithinHallBounds

  const shapeComponentByType: Record<TableShape, ReactNode> = {
    round: (
      <RoundTable
        diameter={form.width}
        isOutOfBounds={width > hallMaxWidth || width > hallMaxHeight}
        onDiameterChange={(value) => setForm({ ...form, width: value })}
      />
    ),
    rectangular: (
      <RectangularTable
        width={form.width}
        height={form.height}
        isWidthOutOfBounds={isWidthOutOfBounds}
        isHeightOutOfBounds={isHeightOutOfBounds}
        onWidthChange={(value) => setForm({ ...form, width: value })}
        onHeightChange={(value) => setForm({ ...form, height: value })}
      />
    ),
  }

  const handleClose = () => {
    resetForm()
    dialog.close()
  }

  const handleSave = () => {
    if (!canSave) {
      return
    }

    planner.addTable(
      {
        name: form.name.trim(),
        shape: form.shape,
        capacity: capacity,
        size: getSizeForShape(form.shape, width, height),
      },
      assignedGuestIdsWithinCapacity,
      dialog.meta.spawnPosition
    )

    handleClose()
  }

  return (
    <Dialog
      open={dialog.opened === "Table.Add"}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogTitle>{t("tables.add")}</DialogTitle>

        <TableNameField
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
        />

        <TableShapeField
          value={form.shape}
          onChange={(shape) => setForm({ ...form, shape })}
        />

        {shapeComponentByType[form.shape]}

        <TableCapacityField
          value={form.capacity}
          onChange={(cap) => setForm({ ...form, capacity: cap })}
        />

        <GuestAssignmentPicker
          capacity={normalizedCapacity}
          assignedGuestIds={assignedGuestIdsWithinCapacity}
          onAssignedGuestIdsChange={(assignedGuestIds) =>
            setForm({ ...form, assignedGuestIds })
          }
        />

        <Button disabled={!canSave} onClick={handleSave}>
          {t("common.save")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
