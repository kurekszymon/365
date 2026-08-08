import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { requireAuth } from "@/lib/auth/guards"
import { supabase } from "@/lib/supabase"
import { track } from "@/lib/analytics/track"

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
        // No properties: the token is a bearer credential (which is why
        // scrubInviteTokens exists) and the wedding id it resolves to is
        // already in the $current_url of the pageview that follows.
        track("invite_claimed")
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
