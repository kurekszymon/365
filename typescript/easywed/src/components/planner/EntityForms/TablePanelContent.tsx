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
import { TableSeatList } from "./fields/TableSeatList"
import { TableSeatMap } from "./fields/TableSeatMap"
import { getSizeForShape, isDimensionsValidForShape } from "./fields/utils"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"

/**
 * Edit form for one table. Add flows don't come through here anymore — new
 * tables are inserted directly from a preset (add hub, canvas context menu)
 * and then routed to this edit view.
 */
export const TablePanelContent = ({ tableId }: { tableId: string }) => {
  const { t } = useTranslation()

  const { hallDimensions, updateTable, saveTable } = usePlannerStore(
    useShallow((state) => ({
      hallDimensions: state.hall.dimensions,
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

  const [form, setForm] = useState(() => {
    const visible = editedTable
      ? getEffectiveSize(editedTable.size, editedTable.rotation)
      : { width: 0, height: 0 }

    return {
      name: editedTable?.name ?? "",
      shape: editedTable?.shape ?? "rectangular",
      capacity: editedTable?.capacity ?? 0,
      width: visible.width,
      height: visible.height,
      rotation: editedTable?.rotation ?? 0,
    }
  })

  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions
  const isWidthOutOfBounds = form.width > hallMaxWidth
  const isHeightOutOfBounds = form.height > hallMaxHeight
  const isRoundOutOfBounds =
    form.width > hallMaxWidth || form.width > hallMaxHeight

  const assignedWithinCapacity = editedAssignedGuestIds.slice(0, form.capacity)

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

  // form.width/height represent the *visible* rectangle. Storage is the
  // canonical, unrotated size — so at rotation=90 we swap before persisting.
  const toStoredSize = (f: typeof form) => {
    if (f.shape === "round") return getSizeForShape(f.shape, f.width, f.height)
    return f.rotation === 90
      ? { width: f.height, height: f.width }
      : { width: f.width, height: f.height }
  }

  // Guest membership is read live from the store (its default) rather than
  // cached in form state: TableSeatList and the seat popovers reassign guests
  // through the store directly, so a cached list would go stale and clobber
  // those newer assignments on the next attribute edit. Only the guest picker —
  // which *is* the thing changing the assignment — passes an explicit list.
  const applyToStore = (
    f: typeof form,
    assignedGuestIds: Array<string> = editedAssignedGuestIds
  ) => {
    if (!isValid(f)) return
    updateTable(
      tableId,
      {
        name: f.name.trim(),
        shape: f.shape,
        capacity: f.capacity,
        size: toStoredSize(f),
        rotation: f.shape === "round" ? 0 : f.rotation,
      },
      assignedGuestIds.slice(0, f.capacity)
    )
  }

  const persist = () => saveTable(tableId)

  const update = (partial: Partial<typeof form>) => {
    const next = { ...form, ...partial }
    setForm(next)
    applyToStore(next)
  }

  const updateAndCommit = (partial: Partial<typeof form>) => {
    update(partial)
    persist()
  }

  const isCustom = form.shape === "custom"

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
    // Two columns once there's room (the wide desktop dialog) — table config on
    // the left, guest assignment + per-seat list on the right — so the form
    // reads wider than tall instead of one long scroll. The narrow mobile
    // drawer keeps its container below the `@xl` threshold, so it stays single
    // column.
    <div className="@container">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 @xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <TableNameField
            value={form.name}
            onChange={(name) => update({ name })}
            onBlur={persist}
          />

          {isCustom ? (
            <p className="text-xs text-muted-foreground">
              {t("tables.shape.custom_readonly")}
            </p>
          ) : (
            <>
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
            </>
          )}

          <TableCapacityField
            value={form.capacity}
            onChange={(capacity) => update({ capacity })}
            onBlur={persist}
          />

          <TableSeatMap
            tableId={tableId}
            shape={form.shape}
            widthM={form.width}
            heightM={form.shape === "round" ? form.width : form.height}
            capacity={form.capacity}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <GuestAssignmentPicker
            tableId={tableId}
            capacity={form.capacity}
            assignedGuestIds={assignedWithinCapacity}
            onAssignedGuestIdsChange={(assignedGuestIds) => {
              applyToStore(form, assignedGuestIds)
              persist()
            }}
          />

          <TableSeatList tableId={tableId} capacity={form.capacity} />
        </div>
      </div>
    </div>
  )
}
