import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RectangularTable } from "./TableRectDimensionsField"
import { RoundTable } from "./TableRoundDimensionsField"
import { TableDialog } from "./TableDialog"
import { getSizeForShape, isDimensionsValidForShape } from "./utils"
import type { Table, TableShape } from "@/stores/planner.store"

const INITIAL_VALUES = {
  name: "",
  shape: "rectangular" as TableShape,
  capacity: 8,
  width: 2,
  height: 1,
  assignedGuestIds: [] as Array<string>,
}

interface TableFormValues {
  name: string
  shape: TableShape
  capacity: number
  width: number
  height: number
  assignedGuestIds: Array<string>
}

interface UseTableFormOptions {
  initialValues?: TableFormValues
  hallDimensions: { width: number; height: number }
  opened: boolean
  mode: "add" | "edit"
  onClose: () => void
  onSubmit: (
    tableDraft: Omit<Table, "id" | "position">,
    assignedGuestIds: Array<string>
  ) => void
}

export const useTableForm = ({
  initialValues,
  hallDimensions,
  opened,
  mode,
  onClose,
  onSubmit,
}: UseTableFormOptions) => {
  const { t } = useTranslation()
  const title = t(mode === "add" ? "tables.add" : "tables.edit")
  const [form, setForm] = useState(initialValues ?? INITIAL_VALUES)

  const { width, height } = form
  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions

  const isDimensionsValid = isDimensionsValidForShape(form.shape, width, height)
  const isWidthOutOfBounds = width > hallMaxWidth
  const isHeightOutOfBounds = height > hallMaxHeight
  const isWithinHallBounds =
    form.shape === "round"
      ? width <= hallMaxWidth && width <= hallMaxHeight
      : width <= hallMaxWidth && height <= hallMaxHeight

  const assignedGuestIdsWithinCapacity = form.assignedGuestIds.slice(
    0,
    form.capacity
  )

  const canSubmit =
    !!form.name.trim() &&
    isDimensionsValid &&
    isWithinHallBounds &&
    form.capacity > 0

  const shapeFields = {
    round: (
      <RoundTable
        diameter={form.width}
        isOutOfBounds={isWidthOutOfBounds || isHeightOutOfBounds}
        onDiameterChange={(value) => setForm((f) => ({ ...f, width: value }))}
      />
    ),
    rectangular: (
      <RectangularTable
        width={form.width}
        height={form.height}
        isWidthOutOfBounds={isWidthOutOfBounds}
        isHeightOutOfBounds={isHeightOutOfBounds}
        onWidthChange={(value) => setForm((f) => ({ ...f, width: value }))}
        onHeightChange={(value) => setForm((f) => ({ ...f, height: value }))}
      />
    ),
  }

  const handleSave = () => {
    if (!canSubmit) return
    onSubmit(
      {
        name: form.name.trim(),
        shape: form.shape,
        capacity: form.capacity,
        size: getSizeForShape(form.shape, width, height),
      },
      assignedGuestIdsWithinCapacity
    )
    onClose()
  }

  return (
    <TableDialog
      opened={opened}
      title={title}
      name={form.name}
      shape={form.shape}
      capacity={form.capacity}
      assignedGuestIds={assignedGuestIdsWithinCapacity}
      shapeFields={shapeFields[form.shape]}
      canSubmit={canSubmit}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onNameChange={(name) => setForm((f) => ({ ...f, name }))}
      onShapeChange={(shape) => setForm((f) => ({ ...f, shape }))}
      onCapacityChange={(capacity) => setForm((f) => ({ ...f, capacity }))}
      onAssignedGuestIdsChange={(assignedGuestIds) =>
        setForm((f) => ({ ...f, assignedGuestIds }))
      }
      onSave={handleSave}
    />
  )
}
