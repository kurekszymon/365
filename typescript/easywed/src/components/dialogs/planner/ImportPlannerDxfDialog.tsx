import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type { ImportPreview } from "@/lib/import/plannerDxf"
import { previewToHallLayout } from "@/lib/import/plannerDxf"
import { DxfLayerMappingStep } from "@/components/dialogs/shared/DxfLayerMappingStep"
import { DxfPreviewStep } from "@/components/dialogs/shared/DxfPreviewStep"
import { FileDropZone } from "@/components/dialogs/shared/FileDropZone"
import { useDxfImportWizard } from "@/components/dialogs/shared/useDxfImportWizard"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { useDialogStore } from "@/stores/dialog.store"
import { nextHallPosition, usePlannerStore } from "@/stores/planner.store"
import {
  deleteHallRow,
  insertFixture,
  insertHall,
  insertTables,
  replacePlannerLayout,
  softDeleteFixture,
  softDeleteTable,
} from "@/lib/sync/mutations"

// What the imported layout does to the current plan: "replace" wipes every
// hall/table/fixture and installs the file as the sole hall; "add" appends the
// file as a NEW hall next to the existing layout, leaving everything in place.
type ImportMode = "replace" | "add"

export const ImportPlannerDxfDialog = () => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ImportMode>("replace")
  const {
    stage,
    unit,
    reset,
    setCommitting,
    setErrorMessage,
    onFileChosen,
    onLayersConfirmed,
    onUnitChange,
  } = useDxfImportWizard({ t })

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )

  const guests = usePlannerStore((s) => s.guests)

  const onClose = () => {
    reset()
    dialog.close()
  }

  const onCommit = async (preview: ImportPreview) => {
    setCommitting()

    if (mode === "add") {
      // Append as a new hall, keeping the current layout untouched. The hall
      // row must land before its entities (hall_id FK), so these awaits are
      // deliberately sequential.
      const { halls } = usePlannerStore.getState()
      const { hall, tables, fixtures } = previewToHallLayout(
        preview,
        nextHallPosition(halls)
      )
      const hallOk = await insertHall(hall)
      if (!hallOk) {
        setErrorMessage(t("import.dxf.commit_failed"))
        return
      }
      const results = await Promise.all([
        tables.length > 0 ? insertTables(tables) : Promise.resolve(true),
        ...fixtures.map((f) => insertFixture(f)),
      ])
      if (results.some((ok) => !ok)) {
        // Best-effort rollback so a partial failure doesn't leave a ghost
        // hall (or orphaned entities) in the DB that the store never shows.
        for (const tbl of tables) void softDeleteTable(tbl.id)
        for (const f of fixtures) void softDeleteFixture(f.id)
        void deleteHallRow(hall.id)
        setErrorMessage(t("import.dxf.commit_failed"))
        return
      }
      usePlannerStore.setState((s) => ({
        halls: [...s.halls, hall],
        tables: [...s.tables, ...tables],
        fixtures: [...s.fixtures, ...fixtures],
      }))
      onClose()
      return
    }

    const { hall, tables, fixtures } = previewToHallLayout(preview)
    const ok = await replacePlannerLayout([hall], tables, fixtures)
    if (!ok) {
      setErrorMessage(t("import.dxf.commit_failed"))
      return
    }
    // Reflect the new layout in the local store immediately so the canvas
    // updates without waiting for a refetch. Guests whose tables were
    // removed get unassigned by the FK cascade server-side.
    usePlannerStore.setState((s) => ({
      halls: [hall],
      tables,
      fixtures,
      guests: s.guests.map((g) =>
        g.tableId && !tables.some((tbl) => tbl.id === g.tableId)
          ? { ...g, tableId: null }
          : g
      ),
    }))
    onClose()
  }

  return (
    <ResponsiveDialog
      open={dialog.opened === "Planner.Import.Dxf"}
      onOpenChange={(open) => {
        // Block close (overlay click / ESC / X) while the destructive commit
        // is in flight so we don't risk a state update on an unmounted
        // component and so the user isn't left wondering whether it landed.
        if (!open && stage.kind !== "committing") onClose()
      }}
      dismissible={stage.kind !== "committing"}
    >
      <ResponsiveDialogContent
        className="sm:max-w-lg"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("import.dxf.title")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {stage.kind === "file" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("import.dxf.intro")}
              </p>
              <FileDropZone
                accept=".dxf"
                extensions={[".dxf"]}
                label={t("import.dxf.drop_here")}
                hint={t("import.dxf.choose_file")}
                onFile={(file) => void onFileChosen(file)}
                onInvalidFile={() =>
                  setErrorMessage(t("import.dxf.invalid_file"))
                }
              />
            </div>
          )}

          {stage.kind === "layers" && (
            <DxfLayerMappingStep
              layers={stage.layers}
              initial={stage.mapping}
              onCancel={reset}
              onConfirm={(mapping) => onLayersConfirmed(mapping, stage.raw)}
            />
          )}

          {stage.kind === "preview" && (
            <div className="flex flex-col gap-3">
              <ButtonGroup className="w-full">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  variant={mode === "replace" ? "default" : "outline"}
                  onClick={() => setMode("replace")}
                >
                  {t("import.dxf.mode_replace")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  variant={mode === "add" ? "default" : "outline"}
                  onClick={() => setMode("add")}
                >
                  {t("import.dxf.mode_add_hall")}
                </Button>
              </ButtonGroup>
              <DxfPreviewStep
                preview={stage.preview}
                warnings={stage.warnings}
                unit={unit}
                onUnitChange={onUnitChange}
                assignedGuests={guests.filter((g) => g.tableId).length}
                onBack={reset}
                onCommit={() => onCommit(stage.preview)}
                showDestructiveWarning={mode === "replace"}
                commitLabelKey={
                  mode === "replace"
                    ? "import.dxf.commit"
                    : "import.dxf.commit_add_hall"
                }
              />
            </div>
          )}

          {stage.kind === "committing" && (
            <p className="text-sm text-muted-foreground">
              {t("import.dxf.committing")}
            </p>
          )}

          {stage.kind === "error" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-destructive">{stage.message}</p>
              <Button variant="outline" onClick={reset}>
                {t("import.dxf.try_again")}
              </Button>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
