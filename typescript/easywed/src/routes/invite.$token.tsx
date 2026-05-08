import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { requireAuth } from "@/lib/auth/guards"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"

export const Route = createFileRoute("/invite/$token")({
  beforeLoad: ({ params }) => {
    requireAuth(`/invite/${params.token}`)
  },
  component: InviteClaim,
})

type Status = { kind: "claiming" } | { kind: "error"; message: string }

function InviteClaim() {
  const { t } = useTranslation()
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>({ kind: "claiming" })

  useEffect(() => {
    const controller = new AbortController()

    supabase
      .rpc("claim_wedding_invitation", { _token: token })
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return
        if (error || !data) {
          setStatus({
            kind: "error",
            message: error?.message ?? t("invite.invalid"),
          })
          return
        }

        // The claim RPC sets profiles.user_type='couple' if it was null.
        // Mirror that in the local store so requireOnboarded doesn't bounce
        // the user to /onboarding for the one render before AuthGate
        // refreshes the profile.
        const userType = useGlobalStore.getState().userType
        if (userType !== "venue") {
          useGlobalStore.setState({ userType: "couple" })
        }

        navigate({ to: "/wedding/$id", params: { id: data }, replace: true })
      })

    return () => controller.abort()
  }, [token, navigate, t])

  return (
    <div className="flex min-h-svh items-center justify-center p-6 text-sm">
      {status.kind === "error" ? (
        <p className="text-destructive">{status.message}</p>
      ) : (
        <p className="text-muted-foreground">{t("invite.claiming")}</p>
      )}
    </div>
  )
}
