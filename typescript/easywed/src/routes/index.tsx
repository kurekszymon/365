import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"
import { DialogManager } from "@/components/dialogs/DialogManager"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    requireAuth("/")
  },
  component: Home,
})

type WeddingRow = {
  id: string
  name: string
  date: string | null
}

function Home() {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const openDialog = useDialogStore((s) => s.open)

  const [weddings, setWeddings] = useState<Array<WeddingRow>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    supabase
      .from("weddings")
      .select("id, name, date")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)

        setWeddings(data ?? [])
        setLoading(false)
      })
  }, [session])

  return (
    <>
      <DialogManager />
      <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">EasyWed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("weddings.subtitle")}
            </p>
          </div>

          <Button onClick={() => openDialog("Wedding.Create")}>
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
