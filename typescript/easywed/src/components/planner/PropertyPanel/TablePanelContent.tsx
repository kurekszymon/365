import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { TableNameField } from "@/components/dialogs/tables/TableNameField"
import { TableShapeField } from "@/components/dialogs/tables/TableShapeField"
import { TableCapacityField } from "@/components/dialogs/tables/TableCapacityField"
import { RectangularTable } from "@/components/dialogs/tables/TableRectDimensionsField"
import { RoundTable } from "@/components/dialogs/tables/TableRoundDimensionsField"
import { GuestAssignmentPicker } from "@/components/dialogs/tables/GuestAssignmentPicker"
import {
  isDimensionsValidForShape,
  getSizeForShape,
} from "@/components/dialogs/tables/utils"
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

  const { tables, hallDimensions, addTable, updateTable } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      hallDimensions: state.hall.dimensions,
      addTable: state.addTable,
      updateTable: state.updateTable,
    }))
  )

  const openTableEdit = usePanelStore((state) => state.openTableEdit)

  const [form, setForm] = useState(() => {
    if (props.mode === "edit") {
      const table = tables.find((t) => t.id === props.tableId)
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
    const table = tables.find((t) => t.id === tableId)
    if (!table) return
    setForm({
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      width: table.size.width,
      height: table.size.height,
      assignedGuestIds: getAssignedGuestIds(tableId),
    })
  }, [tableId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    addTable(
      {
        name: form.name.trim(),
        shape: form.shape,
        capacity: form.capacity,
        size: getSizeForShape(form.shape, form.width, form.height),
      },
      assignedWithinCapacity,
      props.mode === "add" ? props.position : undefined
    )
    // Switch to edit mode for the newly added table
    setTimeout(() => {
      const newTable = usePlannerStore.getState().tables.at(-1)
      if (newTable) openTableEdit(newTable.id)
    }, 0)
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
