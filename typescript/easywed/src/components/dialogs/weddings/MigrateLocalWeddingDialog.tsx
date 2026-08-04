import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type {
  LocalGlobalSnapshot,
  LocalPlannerSnapshot,
} from "@/lib/localWedding"
import type { Reminder } from "@/stores/reminders.store"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth.store"
import { migrateLocalWedding } from "@/lib/sync/migrateLocalWedding"

type Stage =
  | { kind: "idle" }
  | { kind: "committing" }
  | { kind: "error"; message: string }

interface MigrateLocalWeddingDialogProps {
  open: boolean
  planner: LocalPlannerSnapshot
  global: LocalGlobalSnapshot
  reminders: Array<Reminder>
  onClose: () => void
}

// Presentation only - the commit sequence and its rollback rules live in
// migrateLocalWedding.ts, where they're testable. Props-driven rather than
// routed through dialog.store/DialogManager since it's triggered by a sign-in
// transition, not a route.
export const MigrateLocalWeddingDialog = ({
  open,
  planner,
  global,
  reminders,
  onClose,
}: MigrateLocalWeddingDialogProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>({ kind: "idle" })

  const onConfirm = async () => {
    const session = useAuthStore.getState().session
    if (!session) return

    setStage({ kind: "committing" })

    const result = await migrateLocalWedding({
      ownerId: session.user.id,
      planner,
      global,
      reminders,
      fallbackName: t("wedding"),
    })

    // Every failure mode rolls back and leaves localStorage intact, so there is
    // one error state and "try again" is always safe to press - it re-runs the
    // whole migration from the same local snapshot.
    if (!result.ok) {
      setStage({ kind: "error", message: t("guest_mode.migrate.failed") })
      return
    }

    onClose()
    await navigate({
      to: "/wedding/$id/planner",
      params: { id: result.weddingId },
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && stage.kind !== "committing") onClose()
      }}
      dismissible={stage.kind !== "committing"}
    >
      <ResponsiveDialogContent
        className="sm:max-w-lg"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("guest_mode.migrate.title")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {stage.kind === "idle" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("guest_mode.migrate.body")}
              </p>
              <p className="text-sm">
                {t("tables.count", { count: planner.tables.length })}
                {" · "}
                {t("guests.count", { count: planner.guests.length })}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={() => void onConfirm()}>
                  {t("guest_mode.migrate.confirm")}
                </Button>
              </div>
            </div>
          )}

          {stage.kind === "committing" && (
            <p className="text-sm text-muted-foreground">
              {t("guest_mode.migrate.committing")}
            </p>
          )}

          {stage.kind === "error" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-destructive">{stage.message}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={() => void onConfirm()}>
                  {t("common.try_again")}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
