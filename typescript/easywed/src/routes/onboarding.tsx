import { useEffect, useState } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { requireAuth } from "@/lib/auth/guards"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    requireAuth("/onboarding")
    // If profile already classified the user, never render the picker.
    // AuthGate invalidates the router after loadProfile resolves, so this
    // re-runs once userType moves from undefined → 'couple' | 'venue'.
    const userType = useGlobalStore.getState().userType
    if (userType === "couple") {
      throw redirect({ to: "/", replace: true })
    }
    if (userType === "venue") {
      throw redirect({ to: "/venue", replace: true })
    }
  },
  component: Onboarding,
})

type Choice = "couple" | "venue"
type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }

function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userType = useGlobalStore((s) => s.userType)
  const setUserType = useGlobalStore((s) => s.setUserType)
  const session = useAuthStore((s) => s.session)

  const [choice, setChoice] = useState<Choice | null>(null)
  const [venueName, setVenueName] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  // If userType flips to a real value while this screen is mounted (e.g.
  // a tab in the background invokes set_user_type), bounce out. The guard
  // covers initial load; this covers post-mount transitions.
  useEffect(() => {
    if (userType === "couple") navigate({ to: "/", replace: true })
    else if (userType === "venue") navigate({ to: "/venue", replace: true })
  }, [userType, navigate])

  const handleSubmit = async () => {
    if (!choice || !session) return
    if (choice === "venue" && !venueName.trim()) return

    setStatus({ kind: "saving" })

    const { error: roleError } = await supabase.rpc("set_user_type", {
      _user_type: choice,
    })
    if (roleError) {
      setStatus({ kind: "error", message: roleError.message })
      return
    }

    if (choice === "venue") {
      const { error: venueError } = await supabase.from("venues").insert({
        owner_id: session.user.id,
        name: venueName.trim(),
      })
      if (venueError) {
        setStatus({ kind: "error", message: venueError.message })
        return
      }
    }

    setUserType(choice)
    navigate({ to: choice === "couple" ? "/halls" : "/venue", replace: true })
  }

  const submitDisabled =
    !choice ||
    status.kind === "saving" ||
    (choice === "venue" && venueName.trim().length === 0)

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{t("onboarding.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <RoleCard
            title={t("onboarding.couple.label")}
            description={t("onboarding.couple.description")}
            selected={choice === "couple"}
            onSelect={() => setChoice("couple")}
          />
          <RoleCard
            title={t("onboarding.venue.label")}
            description={t("onboarding.venue.description")}
            selected={choice === "venue"}
            onSelect={() => setChoice("venue")}
          />
        </div>

        {choice === "venue" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-name">
              {t("onboarding.venue.name_label")}
            </Label>
            <Input
              id="venue-name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <Button onClick={handleSubmit} disabled={submitDisabled}>
          {t("onboarding.continue")}
        </Button>

        {status.kind === "error" && (
          <p className="text-sm text-destructive">{status.message}</p>
        )}
      </div>
    </div>
  )
}

function RoleCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent"
      }`}
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}
