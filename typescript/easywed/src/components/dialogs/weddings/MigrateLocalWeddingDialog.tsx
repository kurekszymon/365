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

// Commit flow: create wedding -> bulk layout write via the
// replace_planner_layout RPC -> rollback (delete the wedding) on failure,
// plus a guests insert the layout RPC doesn't cover. Props-driven rather
// than routed through dialog.store/DialogManager since it's triggered by a
// sign-in transition, not a route.
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
        // global.date comes from localStorage (readLocalGlobalSnapshot
        // already filters out unparsable strings) - re-checking here too
        // since guest-mode data is explicitly treated as potentially
        // corrupted, and toISOString() throws on an Invalid Date.
        date:
          global.date && !Number.isNaN(global.date.getTime())
            ? global.date.toISOString().slice(0, 10)
            : null,
      })
      .select("id")
      .single()

    if (error) {
      setStage({ kind: "error", message: t("guest_mode.migrate.failed") })
      return
    }

    const previousWeddingId = useGlobalStore.getState().weddingId
    useGlobalStore.setState({ weddingId: data.id })

    // A hall-less snapshot has no layout to migrate - skip straight to guests.
    // (readLocalPlannerSnapshot already normalized legacy single-hall payloads
    // to the multi-hall shape.)
    // replacePlannerLayout maps over planner.tables/fixtures synchronously
    // before it ever awaits a request, so a malformed locally-persisted row
    // (e.g. missing `size`) throws synchronously rather than resolving
    // false - catch it here too so it still hits the rollback + error stage
    // below instead of leaving the dialog stuck on "committing".
    let layoutOk: boolean
    try {
      layoutOk =
        planner.halls.length > 0
          ? await replacePlannerLayout(
              planner.halls,
              planner.tables,
              planner.fixtures
            )
          : true
    } catch (err) {
      console.error("[guest-mode] failed to migrate layout", err)
      layoutOk = false
    }

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
    // isn't rolled back - the layout is real and worth keeping - it's
    // surfaced as a toast after navigating instead. Same synchronous-throw
    // risk as replacePlannerLayout above (malformed locally-persisted guest
    // rows) - catch it so the flow still completes (navigate + toast)
    // instead of rejecting onConfirm() silently.
    let guestsOk = true
    if (planner.guests.length > 0) {
      try {
        guestsOk = await insertGuests(planner.guests)
      } catch (err) {
        console.error("[guest-mode] failed to migrate guests", err)
        guestsOk = false
      }
    }

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
