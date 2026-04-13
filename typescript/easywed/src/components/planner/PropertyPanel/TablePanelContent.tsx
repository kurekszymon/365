import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { TableNameField } from "./fields/TableNameField"
import { TableShapeField } from "./fields/TableShapeField"
import { TableCapacityField } from "./fields/TableCapacityField"
import { RectangularTable } from "./fields/TableRectDimensionsField"
import { RoundTable } from "./fields/TableRoundDimensionsField"
import { GuestAssignmentPicker } from "./fields/GuestAssignmentPicker"
import { isDimensionsValidForShape, getSizeForShape } from "./fields/utils"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"
import type { TableShape, Position } from "@/stores/planner.store"

const INITIAL_FORM = {
  name: "",
  shape: "rectangular" as TableShape,
  capacity: 8,
  width: 2,
  height: 1,
  assignedGuestIds: [] as Array<string>,
}

type Props =
  | { mode: "add"; position?: Position }
  | { mode: "edit"; tableId: string }

function getAssignedGuestIds(tableId: string): Array<string> {
  return usePlannerStore
    .getState()
    .guests.filter((g) => g.tableId === tableId)
    .map((g) => g.id)
}

export const TablePanelContent = (props: Props) => {
  const { t } = useTranslation()

  const { hallDimensions, addTable, updateTable } = usePlannerStore(
    useShallow((state) => ({
      hallDimensions: state.hall.dimensions,
      addTable: state.addTable,
      updateTable: state.updateTable,
    }))
  )

  const openTableEdit = usePanelStore((state) => state.openTableEdit)

  const [form, setForm] = useState(() => {
    if (props.mode === "edit") {
      const table = usePlannerStore
        .getState()
        .tables.find((t) => t.id === props.tableId)
      if (table) {
        return {
          name: table.name,
          shape: table.shape,
          capacity: table.capacity,
          width: table.size.width,
          height: table.size.height,
          assignedGuestIds: getAssignedGuestIds(props.tableId),
        }
      }
    }
    return INITIAL_FORM
  })

  // Re-sync when switching to a different table
  const tableId = props.mode === "edit" ? props.tableId : null
  useEffect(() => {
    if (!tableId) return
    const table = usePlannerStore
      .getState()
      .tables.find((t) => t.id === tableId)
    if (!table) return
    setForm({
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      width: table.size.width,
      height: table.size.height,
      assignedGuestIds: getAssignedGuestIds(tableId),
    })
  }, [tableId])

  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions
  const isWidthOutOfBounds = form.width > hallMaxWidth
  const isHeightOutOfBounds = form.height > hallMaxHeight

  const assignedWithinCapacity = form.assignedGuestIds.slice(0, form.capacity)

  const isValid = (f: typeof form) =>
    !!f.name.trim() &&
    isDimensionsValidForShape(f.shape, f.width, f.height) &&
    (f.shape === "round"
      ? f.width <= hallMaxWidth && f.width <= hallMaxHeight
      : f.width <= hallMaxWidth && f.height <= hallMaxHeight) &&
    f.capacity > 0

  const canSubmit = isValid(form)

  const applyEdit = (f: typeof form) => {
    if (props.mode !== "edit" || !isValid(f)) return
    updateTable(
      props.tableId,
      {
        name: f.name.trim(),
        shape: f.shape,
        capacity: f.capacity,
        size: getSizeForShape(f.shape, f.width, f.height),
      },
      f.assignedGuestIds.slice(0, f.capacity)
    )
  }

  const update = (partial: Partial<typeof form>) => {
    const next = { ...form, ...partial }
    setForm(next)
    applyEdit(next)
  }

  const handleAddSubmit = () => {
    if (!canSubmit) return
    const newId = addTable(
      {
        name: form.name.trim(),
        shape: form.shape,
        capacity: form.capacity,
        size: getSizeForShape(form.shape, form.width, form.height),
      },
      assignedWithinCapacity,
      props.mode === "add" ? props.position : undefined
    )
    openTableEdit(newId)
  }

  const shapeFields =
    form.shape === "round" ? (
      <RoundTable
        diameter={form.width}
        isOutOfBounds={isWidthOutOfBounds || isHeightOutOfBounds}
        onDiameterChange={(width) => update({ width })}
      />
    ) : (
      <RectangularTable
        width={form.width}
        height={form.height}
        isWidthOutOfBounds={isWidthOutOfBounds}
        isHeightOutOfBounds={isHeightOutOfBounds}
        onWidthChange={(width) => update({ width })}
        onHeightChange={(height) => update({ height })}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <TableNameField
        value={form.name}
        onChange={(name) => setForm((f) => ({ ...f, name }))}
        onBlur={props.mode === "edit" ? () => applyEdit(form) : undefined}
      />

      <TableShapeField
        value={form.shape}
        onChange={(shape) => update({ shape })}
      />

      {shapeFields}

      <TableCapacityField
        value={form.capacity}
        onChange={(capacity) => update({ capacity })}
      />

      <GuestAssignmentPicker
        capacity={form.capacity}
        assignedGuestIds={assignedWithinCapacity}
        onAssignedGuestIdsChange={(assignedGuestIds) =>
          update({ assignedGuestIds })
        }
      />

      {props.mode === "add" && (
        <Button onClick={handleAddSubmit} disabled={!canSubmit}>
          {t("tables.add")}
        </Button>
      )}
    </div>
  )
}
