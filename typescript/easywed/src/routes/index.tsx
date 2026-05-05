import { useEffect, useState } from "react"
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"
import { DialogManager } from "@/components/dialogs/DialogManager"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    requireAuth("/")
    requireOnboarded()

    // Venue users go directly to their template library.
    const { userType } = useGlobalStore.getState()
    if (userType === "venue") {
      throw redirect({ to: "/venue/templates", replace: true })
    }
  },
  component: Home,
})

type WeddingRow = {
  id: string
  name: string
  date: string | null
  owner_id: string
}

function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const userType = useGlobalStore((s) => s.userType)
  const openDialog = useDialogStore((s) => s.open)

  const [weddings, setWeddings] = useState<Array<WeddingRow>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    supabase
      .from("weddings")
      .select("id, name, date, owner_id")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setWeddings(data ?? [])
        setLoading(false)
      })
  }, [session])

  // Couples with exactly one wedding get auto-redirected.
  useEffect(() => {
    if (userType !== "couple" || loading) return
    if (weddings.length === 1) {
      void navigate({
        to: "/wedding/$id",
        params: { id: weddings[0].id },
        replace: true,
      })
    }
  }, [userType, weddings, loading, navigate])

  const handleDeleteWedding = async (id: string) => {
    const { error } = await supabase.from("weddings").delete().eq("id", id)
    if (error) {
      console.error(error)
      return
    }
    setWeddings((prev) => prev.filter((w) => w.id !== id))
  }

  const isCouple = userType === "couple"
  const showCreateButton = !isCouple || weddings.length === 0

  return (
    <>
      <DialogManager />
      <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">EasyWed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isCouple && weddings.length > 1
                ? t("weddings.couple_multiple")
                : isCouple
                  ? t("weddings.couple_empty")
                  : t("weddings.subtitle")}
            </p>
          </div>

          {showCreateButton && (
            <Button onClick={() => openDialog("Wedding.Create")}>
              {isCouple ? t("weddings.couple_create") : t("common.create")}
            </Button>
          )}

          <div className="flex flex-col gap-2">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("weddings.loading")}
              </p>
            ) : weddings.length === 0 ? null : isCouple &&
              weddings.length > 1 ? (
              <>
                {weddings.map((wedding) => (
                  <div
                    key={wedding.id}
                    className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm"
                  >
                    <Link
                      to="/wedding/$id"
                      params={{ id: wedding.id }}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {wedding.name || t("wedding.defaults.name")}
                    </Link>
                    {wedding.owner_id === session?.user.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteWedding(wedding.id)}
                      >
                        {t("weddings.couple_delete")}
                      </Button>
                    )}
                  </div>
                ))}
              </>
            ) : (
              weddings.map((wedding) => (
                <Link
                  key={wedding.id}
                  to="/wedding/$id"
                  params={{ id: wedding.id }}
                  className="rounded-md border bg-card p-3 text-sm hover:bg-accent"
                >
                  {wedding.name || t("wedding.defaults.name")}
                </Link>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mx-auto text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.sign_out")}
          </button>
        </div>
      </div>
    </>
  )
}
