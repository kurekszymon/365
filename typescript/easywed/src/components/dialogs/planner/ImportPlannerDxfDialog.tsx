import { useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type { ImportPreview } from "@/lib/import/plannerDxf"
import { DxfLayerMappingStep } from "@/components/dialogs/shared/DxfLayerMappingStep"
import { DxfPreviewStep } from "@/components/dialogs/shared/DxfPreviewStep"
import { useDxfImportWizard } from "@/components/dialogs/shared/useDxfImportWizard"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { usePlannerStore } from "@/stores/planner.store"
import { replacePlannerLayout } from "@/lib/sync/mutations"

export const ImportPlannerDxfDialog = () => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
    const ok = await replacePlannerLayout(
      preview.hall,
      preview.tables,
      preview.fixtures
    )
    if (!ok) {
      setErrorMessage(t("import.dxf.commit_failed"))
      return
    }
    // Reflect the new layout in the local store immediately so the canvas
    // updates without waiting for a refetch. Guests whose tables were
    // removed get unassigned by the FK cascade server-side.
    usePlannerStore.setState((s) => ({
      hall: {
        dimensions: { width: preview.hall.width, height: preview.hall.height },
        preset: preview.hall.preset,
      },
      tables: preview.tables,
      fixtures: preview.fixtures,
      guests: s.guests.map((g) =>
        g.tableId && !preview.tables.some((tbl) => tbl.id === g.tableId)
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  // Clear the input value so picking the same file again still
                  // fires onChange — otherwise the "Try again" loop is flaky
                  // after a parse error.
                  e.target.value = ""
                  if (file) void onFileChosen(file)
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                {t("import.dxf.choose_file")}
              </Button>
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
            <DxfPreviewStep
              preview={stage.preview}
              warnings={stage.warnings}
              unit={unit}
              onUnitChange={onUnitChange}
              assignedGuests={guests.filter((g) => g.tableId).length}
              onBack={reset}
              onCommit={() => onCommit(stage.preview)}
              showDestructiveWarning
              commitLabelKey="import.dxf.commit"
            />
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
