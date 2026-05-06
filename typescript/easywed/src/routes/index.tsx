import { useEffect, useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { DialogManager } from "@/components/dialogs/DialogManager"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    requireAuth("/")
    requireOnboarded()
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
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const userType = useGlobalStore((s) => s.userType)

  const [weddings, setWeddings] = useState<Array<WeddingRow>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userType === "venue") {
      navigate({ to: "/venue", replace: true })
    }
  }, [userType, navigate])

  useEffect(() => {
    if (!session || userType === "venue") return

    supabase
      .from("weddings")
      .select("id, name, date")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)

        setWeddings(data ?? [])
        setLoading(false)
      })
  }, [session, userType])

  // Couple with exactly one wedding: drop them straight onto it.
  useEffect(() => {
    if (loading || userType !== "couple") return
    if (weddings.length === 1) {
      navigate({
        to: "/wedding/$id",
        params: { id: weddings[0].id },
        replace: true,
      })
    }
  }, [loading, userType, weddings, navigate])

  if (userType === "venue") return null

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

          <div className="flex flex-col gap-2">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("weddings.loading")}
              </p>
            ) : weddings.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("weddings.no_wedding_yet")}
                </p>
                <Link to="/halls">
                  <Button className="w-full">
                    {t("weddings.no_wedding_yet.cta")}
                  </Button>
                </Link>
              </div>
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
