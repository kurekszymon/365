import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { TableNameField } from "./fields/TableNameField"
import { TableShapeField } from "./fields/TableShapeField"
import { TableCapacityField } from "./fields/TableCapacityField"
import { TableBatchCountField } from "./fields/TableBatchCountField"
import { RectangularTable } from "./fields/TableRectDimensionsField"
import { RoundTable } from "./fields/TableRoundDimensionsField"
import { getSizeForShape, isDimensionsValidForShape } from "./fields/utils"
import type { Position } from "@/stores/planner.store"
import { DEFAULT_TABLE, usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"

const INITIAL_FORM = {
  name: DEFAULT_TABLE.name,
  shape: DEFAULT_TABLE.shape,
  capacity: DEFAULT_TABLE.capacity,
  width: DEFAULT_TABLE.size.width,
  height: DEFAULT_TABLE.size.height,
  count: 2,
}

const MAX_BATCH_COUNT = 50

interface Props {
  position?: Position
}

export const TableBatchPanelContent = ({ position }: Props) => {
  const { t } = useTranslation()

  const { hallDimensions, addTables } = usePlannerStore(
    useShallow((state) => ({
      hallDimensions: state.hall.dimensions,
      addTables: state.addTables,
    }))
  )

  const openTableEdit = usePanelStore((state) => state.openTableEdit)

  const [form, setForm] = useState(INITIAL_FORM)

  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions
  const isWidthOutOfBounds = form.width > hallMaxWidth
  const isHeightOutOfBounds = form.height > hallMaxHeight
  const isRoundOutOfBounds =
    form.width > hallMaxWidth || form.width > hallMaxHeight

  const isValid = (f: typeof form) => {
    if (!isDimensionsValidForShape(f.shape, f.width, f.height)) return false
    if (f.shape === "round") {
      if (f.width > hallMaxWidth || f.width > hallMaxHeight) return false
    } else {
      if (f.width > hallMaxWidth || f.height > hallMaxHeight) return false
    }
    if (f.capacity <= 0) return false
    if (f.count < 1) return false
    return true
  }

  const canSubmit = isValid(form)

  const update = (partial: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const ids = addTables(
      {
        name: form.name.trim(),
        shape: form.shape,
        capacity: form.capacity,
        size: getSizeForShape(form.shape, form.width, form.height),
      },
      form.count,
      position
    )
    if (ids.length > 0) openTableEdit(ids[0])
  }

  const shapeFields =
    form.shape === "round" ? (
      <RoundTable
        diameter={form.width}
        isOutOfBounds={isRoundOutOfBounds}
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
      <TableNameField value={form.name} onChange={(name) => update({ name })} />

      <TableShapeField
        value={form.shape}
        onChange={(shape) => update({ shape })}
      />

      {shapeFields}

      <TableCapacityField
        value={form.capacity}
        onChange={(capacity) => update({ capacity })}
      />

      <TableBatchCountField
        value={form.count}
        max={MAX_BATCH_COUNT}
        onChange={(count) => update({ count })}
      />

      <Button onClick={handleSubmit} disabled={!canSubmit}>
        {t("tables.add_many", { count: form.count })}
      </Button>
    </div>
  )
}
