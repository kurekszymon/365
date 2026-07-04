import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  Disc3Icon,
  LogInIcon,
  MartiniIcon,
  Music2Icon,
  PresentationIcon,
  ShapesIcon,
} from "lucide-react"
import { clampToHall } from "../Canvas/utils"
import { AddCard } from "./AddCard"
import { FIXTURE_PRESETS, TABLE_PRESETS } from "./addPresets"
import type { FixtureIcon, FixturePreset, TablePreset } from "./addPresets"
import type { Size } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export type AddHubCategory = "tables" | "fixtures"

type Props = {
  // Seeds the Stoły/Elementy sali segmented filter — the desktop
  // `Sidebar/AddEntityDialog` opens pre-filtered to the list it was launched
  // from; the mobile add-hub sheet passes nothing and defaults to tables.
  initialCategory?: AddHubCategory
  // Fires once a preset has been inserted and routed to its edit view, so a
  // wrapping dialog can close itself out of the way.
  onInserted?: () => void
}

const FIXTURE_ICONS: Record<FixtureIcon, typeof ShapesIcon> = {
  stage: PresentationIcon,
  dance_floor: Music2Icon,
  bar: MartiniIcon,
  dj_booth: Disc3Icon,
  entrance: LogInIcon,
  custom: ShapesIcon,
}

// "Dodaj do sali" visual-card picker: segmented Stoły/Elementy sali filter +
// a grid of preset cards. Tapping a card inserts it centered in the hall and
// routes straight to its edit view — same short-circuit already used by the
// canvas's paste-at-cursor and right-click "Add table" flows, no intermediate
// add-form step.
export const AddHubContent = ({
  initialCategory = "tables",
  onInserted,
}: Props) => {
  const { t } = useTranslation()
  const [category, setCategory] = useState<AddHubCategory>(initialCategory)

  const { hallDimensions, addTable, addFixture } = usePlannerStore(
    useShallow((state) => ({
      hallDimensions: state.hall.dimensions,
      addTable: state.addTable,
      addFixture: state.addFixture,
    }))
  )
  const openTableEdit = usePanelStore((state) => state.openTableEdit)
  const openFixtureEdit = usePanelStore((state) => state.openFixtureEdit)

  const centerPosition = (size: Size) =>
    clampToHall(
      {
        x: hallDimensions.width / 2 - size.width / 2,
        y: hallDimensions.height / 2 - size.height / 2,
      },
      size,
      hallDimensions.width,
      hallDimensions.height
    )

  const insertTablePreset = (preset: TablePreset) => {
    const tableId = addTable(
      {
        name: "",
        shape: preset.shape,
        capacity: preset.capacity,
        size: preset.size,
        rotation: 0,
      },
      [],
      centerPosition(preset.size)
    )
    openTableEdit(tableId)
    onInserted?.()
  }

  const insertFixturePreset = (preset: FixturePreset) => {
    // The "custom" card carries no name — it drops a blank fixture and lets
    // the edit view do the shaping, same insert-then-edit shortcut as every
    // other card (there is no separate add form anymore).
    const fixtureId = addFixture(
      {
        name: preset.custom ? "" : t(preset.labelKey),
        shape: preset.shape,
        size: preset.size,
        rotation: 0,
      },
      centerPosition(preset.size)
    )
    openFixtureEdit(fixtureId)
    onInserted?.()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{t("hall.add_hub.hint")}</p>

      <ButtonGroup className="w-full">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          variant={category === "tables" ? "default" : "outline"}
          onClick={() => setCategory("tables")}
        >
          {t("hall.add_hub.tables_tab")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          variant={category === "fixtures" ? "default" : "outline"}
          onClick={() => setCategory("fixtures")}
        >
          {t("hall.add_hub.fixtures_tab")}
        </Button>
      </ButtonGroup>

      <div className="grid grid-cols-3 gap-2.5">
        {category === "tables"
          ? TABLE_PRESETS.map((preset) => (
              <AddCard
                key={preset.key}
                label={t(preset.labelKey)}
                onClick={() => insertTablePreset(preset)}
              >
                {preset.preview === "round" && (
                  <div className="size-11 rounded-full border-2 border-planner-table-border bg-planner-table" />
                )}
                {preset.preview === "rect" && (
                  <div className="h-8 w-14 rounded-md border-2 border-planner-table-border bg-planner-table" />
                )}
                {preset.preview === "oval" && (
                  <div className="h-8 w-14 rounded-full border-2 border-planner-table-border bg-planner-table" />
                )}
              </AddCard>
            ))
          : FIXTURE_PRESETS.map((preset) => {
              const Icon = FIXTURE_ICONS[preset.icon]
              return (
                <AddCard
                  key={preset.key}
                  label={t(preset.labelKey)}
                  onClick={() => insertFixturePreset(preset)}
                >
                  <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" />
                  </div>
                </AddCard>
              )
            })}
      </div>
    </div>
  )
}
