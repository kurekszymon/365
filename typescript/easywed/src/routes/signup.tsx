import { useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Trans, useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { redirectAuthedAwayFromLogin } from "@/lib/auth/guards"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"

type SignupSearch = { next?: string }

export const Route = createFileRoute("/signup")({
  component: Signup,
  validateSearch: (s: Record<string, unknown>): SignupSearch => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: ({ search }) => {
    redirectAuthedAwayFromLogin(search.next)
  },
})

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string }

function Signup() {
  const { t, i18n } = useTranslation()
  const { next } = Route.useSearch()
  const locale = i18n.language.startsWith("pl") ? "pl" : "en"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin)
    if (next && next !== "/") url.searchParams.set("next", next)
    return url.toString()
  }

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    setStatus({ kind: "error", message })
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

    setStatus({ kind: "success" })
  }

  const signUpWithGoogle = async () => {
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
  const canSubmit =
    email.length > 0 && password.length > 0 && accepted && !isLoading

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSubmit) {
      void signUp()
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">easywed.</h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.signup_subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Accepting the Regulamin is contract formation, so it may be
              required. Analytics consent deliberately is NOT here: PostHog runs
              cookieless, and conditioning signup on consent that is not
              necessary for the contract would make it invalid under art. 7(4)
              GDPR. Unticked by default - a pre-ticked box is not acceptance. */}
          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={(value) => setAccepted(value === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="accept-terms"
              className="text-xs leading-relaxed font-normal text-muted-foreground"
            >
              <Trans
                i18nKey="auth.accept_terms"
                components={{
                  terms: (
                    <Link
                      to={locale === "pl" ? "/pl/terms" : "/en/terms"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    />
                  ),
                  privacy: (
                    <Link
                      to={locale === "pl" ? "/pl/privacy" : "/en/privacy"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    />
                  ),
                }}
              />
            </Label>
          </div>

          <Button type="submit" disabled={!canSubmit}>
            {t("auth.sign_up")}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span className="uppercase">{t("auth.or")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <GoogleSignInButton
            onClick={signUpWithGoogle}
            disabled={isLoading || !accepted}
          />
          {!accepted && (
            <p className="text-center text-xs text-muted-foreground">
              {t("auth.accept_terms_required")}
            </p>
          )}
        </div>

        {status.kind === "success" && (
          <p className="text-sm text-green-600">{t("auth.email_sent")}</p>
        )}
        {status.kind === "error" && (
          <p className="text-sm text-destructive">{status.message}</p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.have_account")}{" "}
          <Link
            to="/login"
            search={next ? { next } : {}}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t("auth.sign_in")}
          </Link>
        </p>
      </div>
    </div>
  )
}
