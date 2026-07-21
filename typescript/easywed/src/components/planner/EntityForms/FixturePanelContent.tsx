import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { PencilRulerIcon } from "lucide-react"
import { verticesForFootprint } from "../Canvas/geometryEdit"
import { TableNameField } from "./fields/TableNameField"
import { TableRotationField } from "./fields/TableRotationField"
import { RectangularTable } from "./fields/TableRectDimensionsField"
import type { FixtureShape } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { NumberInput } from "@/components/ui/number-input"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DEFAULT_FIXTURE,
  getEffectiveSize,
  usePlannerStore,
} from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Edit form for one fixture. Add flows don't come through here anymore - new
 * fixtures are inserted directly (add hub presets, canvas context menu) and
 * then routed to this edit view.
 */
export const FixturePanelContent = ({ fixtureId }: { fixtureId: string }) => {
  const { t } = useTranslation()

  const { updateFixture, saveFixture, setFixtureShape } = usePlannerStore(
    useShallow((state) => ({
      updateFixture: state.updateFixture,
      saveFixture: state.saveFixture,
      setFixtureShape: state.setFixtureShape,
    }))
  )
  const openShapeEdit = usePanelStore((state) => state.openShapeEdit)

  const editedFixture = usePlannerStore((state) =>
    state.fixtures.find((f) => f.id === fixtureId)
  )

  // Validate size against the fixture's own hall.
  const hall = usePlannerStore((state) =>
    state.halls.find((h) => h.id === editedFixture?.hallId)
  )
  const hallDimensions = hall?.size ?? { width: Infinity, height: Infinity }

  const [form, setForm] = useState(() => {
    const source = editedFixture ?? DEFAULT_FIXTURE
    const visible = getEffectiveSize(source.size, source.rotation)
    return {
      name: source.name,
      shape: source.shape,
      width: visible.width,
      height: visible.height,
      rotation: source.rotation,
    }
  })

  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions

  const isWidthOutOfBounds = form.width > hallMaxWidth
  const isHeightOutOfBounds = form.height > hallMaxHeight
  const isCircleOutOfBounds =
    form.width > hallMaxWidth || form.width > hallMaxHeight

  const isPolygon = form.shape === "polygon"

  const isDimensionsValid = (f: typeof form) => {
    if (!Number.isFinite(f.width) || f.width <= 0) return false
    if (f.shape === "circle") {
      return f.width <= hallMaxWidth && f.width <= hallMaxHeight
    }
    if (!Number.isFinite(f.height) || f.height <= 0) return false
    return f.width <= hallMaxWidth && f.height <= hallMaxHeight
  }

  const toStoredSize = (f: typeof form) => {
    if (f.shape === "circle") return { width: f.width, height: f.width }
    return f.rotation === 90
      ? { width: f.height, height: f.width }
      : { width: f.width, height: f.height }
  }

  const applyToStore = (f: typeof form) => {
    if (!editedFixture || !isDimensionsValid(f)) return
    updateFixture(fixtureId, {
      name: f.name.trim(),
      shape: f.shape,
      size: toStoredSize(f),
      rotation: f.shape === "circle" ? 0 : f.rotation,
      hallId: editedFixture.hallId,
    })
  }

  const persist = () => saveFixture(fixtureId)

  const update = (partial: Partial<typeof form>) => {
    const next = { ...form, ...partial }
    setForm(next)
    applyToStore(next)
  }

  const updateAndCommit = (partial: Partial<typeof form>) => {
    update(partial)
    persist()
  }

  // Shape conversions to/from polygon go through setFixtureShape (not
  // updateAndCommit): geometry must be set or cleared in the same write as
  // the shape, and the polygon variants force rotation back to 0 because the
  // vertices themselves encode orientation.
  const pickShape = (shape: FixtureShape) => {
    if (shape === form.shape) return
    if (!editedFixture) return

    if (shape === "polygon") {
      // Convert the current visible footprint into vertices, 1:1.
      const size = {
        width: form.width,
        height: form.shape === "circle" ? form.width : form.height,
      }
      setFixtureShape(fixtureId, {
        shape,
        geometry: {
          vertices: verticesForFootprint(form.shape, size),
          closed: true,
        },
        size,
        rotation: 0,
        position: editedFixture.position,
      })
      setForm({ ...form, shape, rotation: 0, height: size.height })
      return
    }
    if (form.shape === "polygon") {
      // Back to a basic shape: keep the polygon's bbox as the footprint and
      // drop the vertices.
      const size =
        shape === "circle"
          ? { width: form.width, height: form.width }
          : { width: form.width, height: form.height }
      setFixtureShape(fixtureId, {
        shape,
        geometry: null,
        size,
        rotation: 0,
        position: editedFixture.position,
      })
      setForm({ ...form, shape, rotation: 0, height: size.height })
      return
    }

    const next: Partial<typeof form> = { shape }
    if (shape === "circle") {
      next.height = form.width
    }
    updateAndCommit(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <TableNameField
        value={form.name}
        onChange={(name) => update({ name })}
        onBlur={persist}
      />

      <Field>
        <FieldLabel>{t("fixtures.shape")}</FieldLabel>
        <FieldContent>
          <ButtonGroup className="w-full">
            {(
              [
                "rectangle",
                "circle",
                "rounded",
                "polygon",
              ] as Array<FixtureShape>
            ).map((shape) => (
              <Button
                key={shape}
                type="button"
                size="xs"
                className="flex-1"
                variant={form.shape === shape ? "default" : "outline"}
                onClick={() => pickShape(shape)}
              >
                {t(`fixtures.shape.${shape}`)}
              </Button>
            ))}
          </ButtonGroup>
        </FieldContent>
      </Field>

      {isPolygon ? (
        <>
          <p className="text-xs text-muted-foreground">
            {t("fixtures.shape.polygon_hint")}
          </p>
          <Button
            variant="outline"
            onClick={() => openShapeEdit(fixtureId, "fixture")}
          >
            <PencilRulerIcon className="size-4" />
            {t("fixtures.shape.edit_button")}
          </Button>
        </>
      ) : (
        <>
          {form.shape === "circle" ? (
            <Field>
              <FieldLabel>{t("fixtures.diameter")}</FieldLabel>
              <FieldContent>
                <NumberInput
                  min={0.1}
                  step={0.1}
                  className="w-full rounded-md border"
                  value={form.width}
                  onValueChange={(width) => update({ width })}
                  onBlur={persist}
                />
                {isCircleOutOfBounds && (
                  <p
                    className="min-h-4 text-xs text-destructive"
                    aria-live="polite"
                  >
                    {t("fixtures.dimensions_oob")}
                  </p>
                )}
              </FieldContent>
            </Field>
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
          )}

          {form.shape !== "circle" && (
            <TableRotationField
              value={form.rotation}
              onChange={(rotation) =>
                updateAndCommit({
                  rotation,
                  width: form.height,
                  height: form.width,
                })
              }
            />
          )}
        </>
      )}
    </div>
  )
}
