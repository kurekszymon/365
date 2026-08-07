import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { requireAuth, sanitizeNextPath } from "@/lib/auth/guards"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { AcceptTermsStep } from "@/components/auth/AcceptTermsStep"

type AcceptTermsSearch = { next?: string }

export const Route = createFileRoute("/accept-terms")({
  component: AcceptTerms,
  validateSearch: (s: Record<string, unknown>): AcceptTermsSearch => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: ({ search }) => {
    requireAuth("/accept-terms")

    // Nobody lands here on purpose - requireAcceptedTerms sends them. Anyone
    // who arrives with nothing outstanding (already accepted, or an account
    // predating the Regulamin) goes straight back out, so the screen can't be
    // reached by typing its path either. "unknown" is left alone: AuthGate is
    // still resolving and will invalidate when it knows.
    if (useProfileStore.getState().termsStatus === "accepted") {
      throw redirect({
        to: sanitizeNextPath(search.next) ?? "/home",
        replace: true,
      })
    }
  },
})

function AcceptTerms() {
  const navigate = useNavigate()
  const { next } = Route.useSearch()
  const userId = useAuthStore((s) => s.session?.user.id)

  // requireAuth already bounced the signed-out case; this is the render before
  // that redirect lands.
  if (!userId) return null

  const onAccepted = () => {
    // The store is what requireAcceptedTerms reads, so it has to move before
    // the navigation - otherwise the root guard bounces them right back here.
    useProfileStore.getState().setTermsStatus("accepted")
    navigate({ to: sanitizeNextPath(next) ?? "/home", replace: true })
  }

  const onDeclined = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error("[auth] sign out after declining terms", error)
    // Either way the local session is gone, and /login is where someone who
    // declined belongs rather than a half-open app.
    navigate({ to: "/login", replace: true })
  }

  return (
    <AcceptTermsStep
      userId={userId}
      onAccepted={onAccepted}
      onDeclined={() => void onDeclined()}
    />
  )
}
