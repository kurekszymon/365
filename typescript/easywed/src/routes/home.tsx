import { useEffect, useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { WeddingSummary } from "@/components/weddings/WeddingListItem"
import type { RemoveMode } from "@/components/weddings/RemoveWeddingDialog"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { WeddingListItem } from "@/components/weddings/WeddingListItem"
import { RemoveWeddingDialog } from "@/components/weddings/RemoveWeddingDialog"

export const Route = createFileRoute("/home")({
  component: Home,
})

type RemoveTarget = {
  wedding: WeddingSummary
  mode: RemoveMode
}

function Home() {
  const { t, i18n } = useTranslation()
  // The marketing landing is language-pinned (/pl, /en) - link the wordmark
  // to the one matching the current UI language.
  const landingPath = i18n.resolvedLanguage === "pl" ? "/pl" : "/en"
  const session = useAuthStore((s) => s.session)
  const isReady = useAuthStore((s) => s.isReady)
  const navigate = useNavigate()

  const [weddings, setWeddings] = useState<Array<WeddingSummary>>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  // Kept separate from `removeOpen` so the target outlives the close: the
  // dialog reads its own copy from it while animating out.
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)

  const openRemove = (wedding: WeddingSummary, mode: RemoveMode) => {
    setRemoveTarget({ wedding, mode })
    setRemoveOpen(true)
  }

  useEffect(() => {
    if (!session) return

    // owner_id decides which exit the row offers: owners delete the wedding
    // for everyone, invited members only drop their own access.
    supabase
      .from("weddings")
      .select("id, name, owner_id")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)

        setWeddings(
          (data ?? []).map((wedding) => ({
            id: wedding.id,
            name: wedding.name,
            isOwner: wedding.owner_id === session.user.id,
          }))
        )
        setLoading(false)
      })
  }, [session])

  const handleCreate = async () => {
    if (!session || creating) return
    setCreating(true)
    const { data, error } = await supabase
      .from("weddings")
      .insert({
        owner_id: session.user.id,
        name:
          weddings.length === 0
            ? t("wedding")
            : `${t("wedding")} ${weddings.length}`, // rename to count
        date: null,
      })
      .select("id")
      .single()
    setCreating(false)
    if (error) {
      console.error(error)
      return
    }
    navigate({ to: "/wedding/$id", params: { id: data.id } })
  }

  // Wait for the first getSession() to resolve before deciding which landing
  // to show - otherwise an already-authenticated user reloading this page would
  // flash the signed-out screen before flipping to their dashboard below.
  if (!isReady) return null

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              <Link to={landingPath}>easywed.</Link>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("weddings.subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/wedding/local">{t("guest_mode.start_planning")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">{t("auth.sign_in")}</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            <Link to={landingPath}>easywed.</Link>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("weddings.subtitle")}
          </p>
        </div>

        <Button onClick={handleCreate} disabled={creating}>
          {t("common.create")}
        </Button>

        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">
              {t("weddings.loading")}
            </p>
          ) : weddings.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {t("weddings.empty")}
            </p>
          ) : (
            // TODO: based on a role (couple/planner/site) render only one wedding / list etc.
            weddings.map((wedding) => (
              <WeddingListItem
                key={wedding.id}
                wedding={wedding}
                onDelete={(target) => openRemove(target, "delete")}
                onLeave={(target) => openRemove(target, "leave")}
              />
            ))
          )}
        </div>

        {/* The target survives closing so the dialog keeps its own wording
            while animating out; `key` gives each new target a fresh
            confirmation field, so a half-typed DELETE can't carry over to the
            next wedding and pre-arm its button. Reopening the *same* target
            reuses the instance, so the dialog clears that field on close
            itself - the two together are what keep it disarmed. */}
        {removeTarget && (
          <RemoveWeddingDialog
            key={`${removeTarget.wedding.id}-${removeTarget.mode}`}
            open={removeOpen}
            wedding={removeTarget.wedding}
            mode={removeTarget.mode}
            onOpenChange={setRemoveOpen}
            onDone={(weddingId) =>
              setWeddings((list) => list.filter((w) => w.id !== weddingId))
            }
          />
        )}

        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <Link
            to="/settings"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("settings.title")}
          </Link>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.sign_out")}
          </button>
        </div>
      </div>
    </div>
  )
}
