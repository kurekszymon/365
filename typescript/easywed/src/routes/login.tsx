import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { redirectAuthedAwayFromLogin } from "@/lib/auth/guards"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"

type LoginSearch = { next?: string }

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: ({ search }) => {
    redirectAuthedAwayFromLogin(search.next)
  },
})

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }

function Login() {
  const { t } = useTranslation()
  const { next } = Route.useSearch()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  // Preserve ?next= through email confirmation + OAuth round-trips.
  // Supabase requires a full absolute URL here, so we construct one.
  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin)
    if (next) url.searchParams.set("next", next)
    return url.toString()
  }

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    setStatus({ kind: "error", message })
  }

  const signIn = async () => {
    setStatus({ kind: "loading" })

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return handleError(error)
    }

    setStatus({ kind: "idle" })
  }

  const signUp = async () => {
    setStatus({ kind: "loading" })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    })
    if (error) {
      return handleError(error)
    }

    setStatus({ kind: "idle" })
  }

  const signInWithGoogle = async () => {
    setStatus({ kind: "loading" })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    })
    if (error) {
      return handleError(error)
    }
  }

  const isLoading = status.kind === "loading"
  const canSubmit = email.length > 0 && password.length > 0 && !isLoading

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">EasyWed</h1>
          <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        <div className="flex justify-center">
          <GoogleSignInButton onClick={signInWithGoogle} disabled={isLoading} />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span className="uppercase">{t("auth.or")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={signIn} disabled={!canSubmit}>
            {t("auth.sign_in")}
          </Button>
          <Button variant="outline" onClick={signUp} disabled={!canSubmit}>
            {t("auth.sign_up")}
          </Button>
        </div>

        {status.kind === "error" && (
          <p className="text-sm text-destructive">{status.message}</p>
        )}
      </div>
    </div>
  )
}
