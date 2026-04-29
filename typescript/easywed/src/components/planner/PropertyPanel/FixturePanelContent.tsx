import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { TableNameField } from "./fields/TableNameField"
import { TableRotationField } from "./fields/TableRotationField"
import { RectangularTable } from "./fields/TableRectDimensionsField"
import type { FixtureShape, Position } from "@/stores/planner.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { usePanelStore } from "@/stores/panel.store"
import {
  DEFAULT_FIXTURE,
  getEffectiveSize,
  usePlannerStore,
} from "@/stores/planner.store"

const INITIAL_FORM = {
  name: DEFAULT_FIXTURE.name,
  shape: DEFAULT_FIXTURE.shape,
  width: DEFAULT_FIXTURE.size.width,
  height: DEFAULT_FIXTURE.size.height,
  rotation: DEFAULT_FIXTURE.rotation,
}

type Props =
  | { mode: "add"; position?: Position }
  | { mode: "edit"; fixtureId: string }

export const FixturePanelContent = (props: Props) => {
  const { t } = useTranslation()

  const fixtureId = props.mode === "edit" && props.fixtureId

  const { hallDimensions, addFixture, updateFixture, saveFixture } =
    usePlannerStore(
      useShallow((state) => ({
        hallDimensions: state.hall.dimensions,
        addFixture: state.addFixture,
        updateFixture: state.updateFixture,
        saveFixture: state.saveFixture,
      }))
    )

  const editedFixture = usePlannerStore((state) =>
    state.fixtures.find((f) => f.id === fixtureId)
  )

  const openFixtureEdit = usePanelStore((state) => state.openFixtureEdit)

  const [form, setForm] = useState(() => {
    if (props.mode === "edit" && editedFixture) {
      const visible = getEffectiveSize(
        editedFixture.size,
        editedFixture.rotation
      )
      return {
        name: editedFixture.name,
        shape: editedFixture.shape,
        width: visible.width,
        height: visible.height,
        rotation: editedFixture.rotation,
      }
    }
    return INITIAL_FORM
  })

  const { width: hallMaxWidth, height: hallMaxHeight } = hallDimensions

  const isWidthOutOfBounds = form.width > hallMaxWidth
  const isHeightOutOfBounds = form.height > hallMaxHeight
  const isCircleOutOfBounds =
    form.width > hallMaxWidth || form.width > hallMaxHeight

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
    if (props.mode !== "edit" || !isDimensionsValid(f)) return
    updateFixture(props.fixtureId, {
      name: f.name.trim(),
      shape: f.shape,
      size: toStoredSize(f),
      rotation: f.shape === "circle" ? 0 : f.rotation,
    })
  }

  const persist = () => {
    if (props.mode !== "edit") return
    saveFixture(props.fixtureId)
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

  const canSubmit = isDimensionsValid(form)

  const handleAddSubmit = () => {
    if (props.mode !== "add" || !canSubmit) return

    const newId = addFixture(
      {
        name: form.name.trim(),
        shape: form.shape,
        size: toStoredSize(form),
        rotation: form.shape === "circle" ? 0 : form.rotation,
      },
      props.position
    )

    openFixtureEdit(newId)
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
            {(["rectangle", "circle", "rounded"] as Array<FixtureShape>).map(
              (shape) => (
                <Button
                  key={shape}
                  type="button"
                  size="xs"
                  className="flex-1"
                  variant={form.shape === shape ? "default" : "outline"}
                  onClick={() => {
                    const next: Partial<typeof form> = { shape }
                    if (shape === "circle") {
                      next.height = form.width
                    }
                    updateAndCommit(next)
                  }}
                >
                  {t(`fixtures.shape.${shape}`)}
                </Button>
              )
            )}
          </ButtonGroup>
        </FieldContent>
      </Field>

      {form.shape === "circle" ? (
        <Field>
          <FieldLabel>{t("fixtures.diameter")}</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              className="w-full rounded-md border"
              value={form.width}
              onChange={(e) => update({ width: Number(e.target.value) })}
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

      {props.mode === "add" && (
        <Button onClick={handleAddSubmit} disabled={!canSubmit}>
          {t("fixtures.add")}
        </Button>
      )}
    </div>
  )
}
