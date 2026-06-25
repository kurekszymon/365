import { useNavigate } from "@tanstack/react-router"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type { ImportPreview } from "@/lib/import/plannerDxf"
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
import { useDialogStore } from "@/stores/dialog.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { replacePlannerLayout } from "@/lib/sync/mutations"

export const CreateWeddingFromDxfDialog = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
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

  const onClose = () => {
    reset()
    dialog.close()
  }

  const onCommit = async (preview: ImportPreview) => {
    const session = useAuthStore.getState().session
    if (!session) {
      setErrorMessage(t("import.dxf.create.failed"))
      return
    }

    setCommitting()

    const { data, error } = await supabase
      .from("weddings")
      .insert({ owner_id: session.user.id, name: t("wedding"), date: null })
      .select("id")
      .single()

    if (error) {
      setErrorMessage(t("import.dxf.create.failed"))
      return
    }

    const previousWeddingId = useGlobalStore.getState().weddingId
    useGlobalStore.setState({ weddingId: data.id })

    const ok = await replacePlannerLayout(
      preview.hall,
      preview.tables,
      preview.fixtures
    )
    if (!ok) {
      const { error: rollbackError } = await supabase
        .from("weddings")
        .delete()
        .eq("id", data.id)
      if (rollbackError) {
        console.error("[import-dxf] failed to rollback wedding", rollbackError)
      }
      useGlobalStore.setState({ weddingId: previousWeddingId })
      setErrorMessage(t("import.dxf.create.failed"))
      return
    }

    onClose()
    await navigate({ to: "/wedding/$id/planner", params: { id: data.id } })
  }

  return (
    <ResponsiveDialog
      open={dialog.opened === "Wedding.Import.Dxf"}
      onOpenChange={(open) => {
        if (!open && stage.kind !== "committing") onClose()
      }}
      dismissible={stage.kind !== "committing"}
    >
      <ResponsiveDialogContent
        className="sm:max-w-lg"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("import.dxf.create.title")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {stage.kind === "file" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("import.dxf.create.intro")}
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
            <DxfPreviewStep
              preview={stage.preview}
              warnings={stage.warnings}
              unit={unit}
              onUnitChange={onUnitChange}
              onBack={reset}
              onCommit={() => onCommit(stage.preview)}
              commitLabelKey="import.dxf.create.commit"
            />
          )}

          {stage.kind === "committing" && (
            <p className="text-sm text-muted-foreground">
              {t("import.dxf.create.committing")}
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
