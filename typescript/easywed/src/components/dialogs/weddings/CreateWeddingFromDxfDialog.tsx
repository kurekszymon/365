import { useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
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
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { replacePlannerLayout } from "@/lib/sync/mutations"

export const CreateWeddingFromDxfDialog = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length === 0) return
    const file = e.dataTransfer.files[0]
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      setErrorMessage(t("import.dxf.invalid_file"))
      return
    }
    void onFileChosen(file)
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (file) void onFileChosen(file)
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50"
                }`}
              >
                <span className="text-sm font-medium">
                  {t("import.dxf.drop_here")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("import.dxf.choose_file")}
                </span>
              </button>
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
