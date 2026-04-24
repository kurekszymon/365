import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { TableNameField } from "./fields/TableNameField"
import { TableShapeField } from "./fields/TableShapeField"
import { TableCapacityField } from "./fields/TableCapacityField"
import { TableRotationField } from "./fields/TableRotationField"
import { RectangularTable } from "./fields/TableRectDimensionsField"
import { RoundTable } from "./fields/TableRoundDimensionsField"
import { GuestAssignmentPicker } from "./fields/GuestAssignmentPicker"
import { getSizeForShape, isDimensionsValidForShape } from "./fields/utils"
import type { Position } from "@/stores/planner.store"
import {
  DEFAULT_TABLE,
  getEffectiveSize,
  usePlannerStore,
} from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"

const INITIAL_FORM = {
  name: DEFAULT_TABLE.name,
  shape: DEFAULT_TABLE.shape,
  capacity: DEFAULT_TABLE.capacity,
  width: DEFAULT_TABLE.size.width,
  height: DEFAULT_TABLE.size.height,
  rotation: DEFAULT_TABLE.rotation,
  assignedGuestIds: [] as Array<string>,
}

type Props =
  | { mode: "add"; position?: Position }
  | { mode: "edit"; tableId: string }

export const TablePanelContent = (props: Props) => {
  const { t } = useTranslation()

  const tableId = props.mode === "edit" && props.tableId

  const { hallDimensions, addTable, updateTable, saveTable } = usePlannerStore(
    useShallow((state) => ({
      hallDimensions: state.hall.dimensions,
      addTable: state.addTable,
      updateTable: state.updateTable,
      saveTable: state.saveTable,
    }))
  )

  const editedTable = usePlannerStore((state) =>
    state.tables.find((table) => table.id === tableId)
  )

  const editedAssignedGuestIds = usePlannerStore(
    useShallow((state) =>
      state.guests.filter((g) => g.tableId === tableId).map((g) => g.id)
    )
  )

  const openTableEdit = usePanelStore((state) => state.openTableEdit)

  const [form, setForm] = useState(() => {
    if (props.mode === "edit" && editedTable) {
      const visible = getEffectiveSize(editedTable.size, editedTable.rotation)

      return {
        name: editedTable.name,
        shape: editedTable.shape,
        capacity: editedTable.capacity,
        width: visible.width,
        height: visible.height,
        rotation: editedTable.rotation,
        assignedGuestIds: editedAssignedGuestIds,
      }
    }
    return INITIAL_FORM
  })

  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions
  const isWidthOutOfBounds = form.width > hallMaxWidth
  const isHeightOutOfBounds = form.height > hallMaxHeight
  const isRoundOutOfBounds =
    form.width > hallMaxWidth || form.width > hallMaxHeight

  const assignedWithinCapacity = form.assignedGuestIds.slice(0, form.capacity)

  const isValid = (f: typeof form) => {
    if (!isDimensionsValidForShape(f.shape, f.width, f.height)) return false
    if (f.shape === "round") {
      if (f.width > hallMaxWidth || f.width > hallMaxHeight) return false
    } else {
      if (f.width > hallMaxWidth || f.height > hallMaxHeight) return false
    }
    if (f.capacity <= 0) return false
    return true
  }

  const canSubmit = isValid(form)

  // form.width/height represent the *visible* rectangle. Storage is the
  // canonical, unrotated size — so at rotation=90 we swap before persisting.
  const toStoredSize = (f: typeof form) => {
    if (f.shape === "round") return getSizeForShape(f.shape, f.width, f.height)
    return f.rotation === 90
      ? { width: f.height, height: f.width }
      : { width: f.width, height: f.height }
  }

  const applyToStore = (f: typeof form) => {
    if (props.mode !== "edit" || !isValid(f)) return
    updateTable(
      props.tableId,
      {
        name: f.name.trim(),
        shape: f.shape,
        capacity: f.capacity,
        size: toStoredSize(f),
        rotation: f.shape === "round" ? 0 : f.rotation,
      },
      f.assignedGuestIds.slice(0, f.capacity)
    )
  }

  const persist = () => {
    if (props.mode !== "edit") return
    saveTable(props.tableId)
  }

  const update = (partial: Partial<typeof form>) => {
    const next = { ...form, ...partial }
    setForm(next)
    applyToStore(next)
  }

  const updateAndCommit = (partial: Partial<typeof form>) => {
    update(partial)
    persist()
  }

  const handleAddSubmit = () => {
    if (!canSubmit) return
    const newId = addTable(
      {
        name: form.name.trim(),
        shape: form.shape,
        capacity: form.capacity,
        size: toStoredSize(form),
        rotation: form.shape === "round" ? 0 : form.rotation,
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
        isOutOfBounds={isRoundOutOfBounds}
        onDiameterChange={(width) => update({ width })}
        onBlur={persist}
      />
    ) : (
      <RectangularTable
        width={form.width}
        height={form.height}
        isWidthOutOfBounds={isWidthOutOfBounds}
        isHeightOutOfBounds={isHeightOutOfBounds}
        onWidthChange={(width) => update({ width })}
        onHeightChange={(height) => update({ height })}
        onBlur={persist}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <TableNameField
        value={form.name}
        onChange={(name) => update({ name })}
        onBlur={persist}
      />

      <TableShapeField
        value={form.shape}
        onChange={(shape) => updateAndCommit({ shape })}
      />

      {shapeFields}

      {form.shape === "rectangular" && (
        <TableRotationField
          value={form.rotation}
          onChange={(rotation) => {
            if (rotation === form.rotation) return
            updateAndCommit({
              rotation,
              width: form.height,
              height: form.width,
            })
          }}
        />
      )}

      <TableCapacityField
        value={form.capacity}
        onChange={(capacity) => update({ capacity })}
        onBlur={persist}
      />

      <GuestAssignmentPicker
        tableId={props.mode === "edit" ? props.tableId : null}
        capacity={form.capacity}
        assignedGuestIds={assignedWithinCapacity}
        onAssignedGuestIdsChange={(assignedGuestIds) =>
          updateAndCommit({ assignedGuestIds })
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
