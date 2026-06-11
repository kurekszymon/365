import { useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type { Guest } from "@/stores/planner.store"
import { useGuestImportWizard } from "@/components/dialogs/shared/useGuestImportWizard"
import { GuestImportMappingStep } from "@/components/dialogs/guests/GuestImportMappingStep"
import { GuestImportResultPreview } from "@/components/dialogs/guests/GuestImportResultPreview"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { useDialogStore } from "@/stores/dialog.store"
import { usePlannerStore } from "@/stores/planner.store"

// Above this, warn that a big import may take a moment / is hard to review in
// the panel. Soft — it never blocks the commit.
const LARGE_IMPORT_THRESHOLD = 1000

export const ImportGuestsDialog = () => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const {
    stage,
    reset,
    setCommitting,
    setErrorMessage,
    onFileChosen,
    setMapping,
    onMappingConfirmed,
    backToMapping,
  } = useGuestImportWizard({ t })

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )
  const addGuests = usePlannerStore((s) => s.addGuests)

  const onClose = () => {
    reset()
    dialog.close()
  }

  const onCommit = async (guests: Array<Omit<Guest, "id">>) => {
    setCommitting()
    const ok = await addGuests(guests)
    if (ok) onClose()
    // Optimistic rows are already in the list, but persistence failed — keep the
    // dialog open on the error stage so the user knows to retry rather than
    // assuming the import succeeded.
    else setErrorMessage(t("guests.import.failed"))
  }

  return (
    <Dialog
      open={dialog.opened === "Guest.Import"}
      onOpenChange={(open) => {
        if (!open && stage.kind !== "committing") onClose()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogTitle>{t("guests.import.title")}</DialogTitle>

        {stage.kind === "file" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("guests.import.intro")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                // Reset so picking the same file after an error re-fires onChange.
                e.target.value = ""
                if (file) void onFileChosen(file)
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              {t("guests.import.choose_file")}
            </Button>
          </div>
        )}

        {stage.kind === "mapping" && (
          <GuestImportMappingStep
            headers={stage.headers}
            rows={stage.rows}
            mapping={stage.mapping}
            onSetMapping={setMapping}
            onBack={reset}
            onNext={onMappingConfirmed}
          />
        )}

        {stage.kind === "preview" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("guests.import.summary", { count: stage.guests.length })}
              {stage.skipped > 0 &&
                ` · ${t("guests.import.skipped", { count: stage.skipped })}`}
            </p>
            {stage.overflowed > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-500">
                {t("guests.import.overflowed", { count: stage.overflowed })}
              </p>
            )}
            {stage.guests.length > LARGE_IMPORT_THRESHOLD && (
              <p className="text-sm text-amber-600 dark:text-amber-500">
                {t("guests.import.large_warning", {
                  count: stage.guests.length,
                })}
              </p>
            )}
            <GuestImportResultPreview
              mapping={stage.mapping}
              guests={stage.guests}
            />
            <ButtonGroup className="justify-end">
              <Button variant="outline" onClick={backToMapping}>
                {t("guests.import.back")}
              </Button>
              <Button
                disabled={stage.guests.length === 0}
                onClick={() => void onCommit(stage.guests)}
              >
                {t("guests.import.commit", { count: stage.guests.length })}
              </Button>
            </ButtonGroup>
          </div>
        )}

        {stage.kind === "committing" && (
          <p className="text-sm text-muted-foreground">
            {t("guests.import.committing")}
          </p>
        )}

        {stage.kind === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">{stage.message}</p>
            <Button variant="outline" onClick={reset}>
              {t("guests.import.try_again")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
