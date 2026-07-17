import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { InfoIcon, Trash2Icon } from "lucide-react"
import { clampGridSpacing, validSpacings } from "../Canvas/utils"
import { DimensionsRectangle } from "./fields/DimensionsRectangle"

import { usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Settings form for ONE hall (identified by `hallId`): name, floor, size and
// world position, plus the delete flow. The grid settings at the bottom are
// canvas-wide (view.store), kept here because this panel is where the hall's
// visual setup lives.
export const HallPanelContent = ({ hallId }: { hallId: string }) => {
  const { t } = useTranslation()

  const hall = usePlannerStore((state) =>
    state.halls.find((h) => h.id === hallId)
  )
  const { updateHall, saveHall, updateHallPosition } = usePlannerStore(
    useShallow((state) => ({
      updateHall: state.updateHall,
      saveHall: state.saveHall,
      updateHallPosition: state.updateHallPosition,
    }))
  )
  const openDialog = useDialogStore((state) => state.open)

  const gridSpacing = useViewStore((state) => state.gridSpacing)
  const gridStyle = useViewStore((state) => state.gridStyle)
  const setGridSpacing = useViewStore((state) => state.setGridSpacing)
  const setGridStyle = useViewStore((state) => state.setGridStyle)

  useEffect(() => () => saveHall(hallId), [saveHall, hallId])

  // The hall can disappear under this panel (deleted from the dialog).
  if (!hall) return null

  const setWidth = (width: number) => {
    const spacing = clampGridSpacing(gridSpacing, width, hall.size.height)
    updateHall(hallId, { size: { width, height: hall.size.height } })
    saveHall(hallId)
    if (spacing !== gridSpacing) setGridSpacing(spacing)
  }

  const setHeight = (height: number) => {
    const spacing = clampGridSpacing(gridSpacing, hall.size.width, height)
    updateHall(hallId, { size: { width: hall.size.width, height } })
    saveHall(hallId)
    if (spacing !== gridSpacing) setGridSpacing(spacing)
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>{t("common.name")}</FieldLabel>
        <FieldContent>
          <Input
            type="text"
            value={hall.name}
            className="w-full rounded-md border"
            placeholder={t("hall.name_placeholder")}
            onChange={(e) => updateHall(hallId, { name: e.target.value })}
            onBlur={() => saveHall(hallId)}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{t("hall.floor")}</FieldLabel>
        <FieldContent>
          <Input
            type="number"
            value={hall.floor ?? ""}
            className="w-full rounded-md border"
            placeholder={t("hall.floor_placeholder")}
            onChange={(e) => {
              const raw = e.target.value
              const parsed = Number(raw)
              updateHall(hallId, {
                floor:
                  raw === "" || !Number.isFinite(parsed)
                    ? null
                    : Math.trunc(parsed),
              })
            }}
            onBlur={() => saveHall(hallId)}
          />
        </FieldContent>
      </Field>

      <DimensionsRectangle
        width={hall.size.width}
        height={hall.size.height}
        setWidth={setWidth}
        setHeight={setHeight}
      />

      {/* World position - the canvas drag (label chip) is the primary way to
          arrange halls; these fields are the precise/accessible fallback. */}
      <Field>
        <FieldTitle>{t("hall.position")}</FieldTitle>
        <FieldContent className="flex-row gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <FieldLabel htmlFor="hall-pos-x">X</FieldLabel>
            <NumberInput
              id="hall-pos-x"
              step={0.5}
              value={hall.position.x}
              onValueChange={(x) =>
                updateHallPosition(hallId, x, hall.position.y)
              }
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <FieldLabel htmlFor="hall-pos-y">Y</FieldLabel>
            <NumberInput
              id="hall-pos-y"
              step={0.5}
              value={hall.position.y}
              onValueChange={(y) =>
                updateHallPosition(hallId, hall.position.x, y)
              }
            />
          </div>
        </FieldContent>
      </Field>

      <Field>
        <div className="flex items-center gap-1.5">
          <FieldTitle>{t("canvas.grid.spacing")}</FieldTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="size-3.5 cursor-default text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right">
              {t("canvas.grid.spacing_tooltip")}
            </TooltipContent>
          </Tooltip>
        </div>
        <ButtonGroup className="w-full">
          {validSpacings(hall.size.width, hall.size.height).map((option) => (
            <Button
              key={option}
              type="button"
              size="xs"
              className="flex-1"
              variant={gridSpacing === option ? "default" : "outline"}
              onClick={() => setGridSpacing(option)}
            >
              {option === "auto"
                ? t("common.auto")
                : t("common.meters", { count: option })}
            </Button>
          ))}
        </ButtonGroup>
      </Field>
      <Field>
        <div className="flex items-center gap-1.5">
          <FieldTitle>{t("canvas.grid.style")}</FieldTitle>
        </div>
        <ButtonGroup className="w-full">
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={gridStyle === "grid" ? "default" : "outline"}
            onClick={() => setGridStyle("grid")}
          >
            {t("canvas.grid.grid")}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={gridStyle === "dots" ? "default" : "outline"}
            onClick={() => setGridStyle("dots")}
          >
            {t("canvas.grid.dots")}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={gridStyle === "off" ? "default" : "outline"}
            onClick={() => setGridStyle("off")}
          >
            {t("canvas.grid.off")}
          </Button>
        </ButtonGroup>
      </Field>

      <Button
        type="button"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => openDialog("Planner.Hall.Delete", { hallId })}
      >
        <Trash2Icon className="size-4" />
        {t("hall.delete")}
      </Button>
    </div>
  )
}
