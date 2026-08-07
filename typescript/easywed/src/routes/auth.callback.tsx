import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { sanitizeNextPath } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"
import { supabase } from "@/lib/supabase"
import {
  fetchTermsStatus,
  recordPendingTermsAcceptance,
} from "@/lib/sync/termsAcceptance"
import { AcceptTermsStep } from "@/components/auth/AcceptTermsStep"

type CallbackSearch = { next?: string }

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
  validateSearch: (s: Record<string, unknown>): CallbackSearch => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
})

function AuthCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { next } = Route.useSearch()
  const userId = useAuthStore((s) => s.session?.user.id)
  const isReady = useAuthStore((s) => s.isReady)
  const [needsTerms, setNeedsTerms] = useState(false)

  useEffect(() => {
    if (!isReady) return
    if (!userId) {
      // Only set ?next= if not root
      navigate({
        to: "/login",
        search: next && next !== "/" ? { next } : {},
        replace: true,
      })
      return
    }

    const controller = new AbortController()

    const resolve = async () => {
      // Consume the sign-up form's pending marker first. Someone who already
      // ticked the box must not be asked a second time just because
      // signInWithOAuth couldn't carry the answer across the redirect.
      await recordPendingTermsAcceptance(userId)

      const status = await fetchTermsStatus(userId)
      // Both branches below are side effects on an unmounted-or-superseded
      // route otherwise; the two reads above are safe to let finish.
      if (controller.signal.aborted) return

      if (status === "outstanding") {
        setNeedsTerms(true)
        return
      }

      navigate({ to: sanitizeNextPath(next) ?? "/home", replace: true })
    }

    void resolve()

    return () => controller.abort()
  }, [isReady, userId, next, navigate])

  const leave = () => {
    navigate({ to: sanitizeNextPath(next) ?? "/home", replace: true })
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error("[auth] sign out after declining terms", error)
    // Either way: the session is gone locally, and /login is where someone who
    // declined should land rather than a half-open app.
    navigate({ to: "/login", replace: true })
  }

  if (needsTerms && userId) {
    return (
      <AcceptTermsStep
        userId={userId}
        onAccepted={leave}
        onDeclined={() => void signOut()}
      />
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
      {t("auth.signing_you_in")}
    </div>
  )
}
