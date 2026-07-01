import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type {
  LocalGlobalSnapshot,
  LocalPlannerSnapshot,
} from "@/lib/localWedding"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { insertGuests, replacePlannerLayout } from "@/lib/sync/mutations"
import { clearLocalWeddingStorage } from "@/lib/localWedding"

type Stage =
  | { kind: "idle" }
  | { kind: "committing" }
  | { kind: "error"; message: string }

interface MigrateLocalWeddingDialogProps {
  open: boolean
  planner: LocalPlannerSnapshot
  global: LocalGlobalSnapshot
  onClose: () => void
}

// Mirrors CreateWeddingFromDxfDialog's commit flow (create wedding -> bulk
// layout write -> rollback on failure), plus a guests insert the layout RPC
// doesn't cover. Props-driven rather than routed through dialog.store/
// DialogManager since it's triggered by a sign-in transition, not a route.
export const MigrateLocalWeddingDialog = ({
  open,
  planner,
  global,
  onClose,
}: MigrateLocalWeddingDialogProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>({ kind: "idle" })

  const onConfirm = async () => {
    const session = useAuthStore.getState().session
    if (!session) return

    setStage({ kind: "committing" })

    const { data, error } = await supabase
      .from("weddings")
      .insert({
        owner_id: session.user.id,
        name: global.name?.trim() || t("wedding"),
        date: global.date ? global.date.toISOString().slice(0, 10) : null,
      })
      .select("id")
      .single()

    if (error) {
      setStage({ kind: "error", message: t("guest_mode.migrate.failed") })
      return
    }

    const previousWeddingId = useGlobalStore.getState().weddingId
    useGlobalStore.setState({ weddingId: data.id })

    // Tables can only be added once a hall preset is chosen, so a preset-less
    // snapshot has no layout to migrate — skip straight to guests.
    const layoutOk = planner.hall.preset
      ? await replacePlannerLayout(
          {
            preset: planner.hall.preset,
            width: planner.hall.dimensions.width,
            height: planner.hall.dimensions.height,
          },
          planner.tables,
          planner.fixtures
        )
      : true

    if (!layoutOk) {
      const { error: rollbackError } = await supabase
        .from("weddings")
        .delete()
        .eq("id", data.id)
      if (rollbackError) {
        console.error(
          "[guest-mode] failed to rollback wedding after migration",
          rollbackError
        )
      }
      useGlobalStore.setState({ weddingId: previousWeddingId })
      setStage({ kind: "error", message: t("guest_mode.migrate.failed") })
      return
    }

    // Guests aren't covered by replacePlannerLayout's RPC. A failure here
    // isn't rolled back — the layout is real and worth keeping — it's
    // surfaced as a toast after navigating instead.
    const guestsOk =
      planner.guests.length === 0 || (await insertGuests(planner.guests))

    clearLocalWeddingStorage()
    onClose()
    await navigate({ to: "/wedding/$id/planner", params: { id: data.id } })

    if (!guestsOk) {
      toast.error(t("guest_mode.migrate.partial_failed"), {
        id: "guest-migrate-partial",
      })
    }
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
                {t("guest_mode.migrate.summary", {
                  tables: planner.tables.length,
                  guests: planner.guests.length,
                })}
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
                  {t("import.dxf.try_again")}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
