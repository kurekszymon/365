import { useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
})

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }

/**
 * Where the recovery email lands.
 *
 * The session is already established by the time this renders: the Supabase
 * client picks the recovery token out of the URL fragment on init
 * (`detectSessionInUrl`), and AuthGate's getSession() awaits that same
 * initialisation before flipping isReady. So isReady is the signal that the
 * link has been judged - a session means it was good, no session means it was
 * expired, already used, or someone typed the path.
 */
function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isReady = useAuthStore((s) => s.isReady)
  const hasSession = useAuthStore((s) => s.session !== null)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    setStatus({ kind: "error", message })
  }

  const savePassword = async () => {
    setStatus({ kind: "loading" })

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return handleError(error)
    }

    // The recovery session is a real session, so this is where they are signed
    // in from. replace, so Back doesn't return to a form whose token is spent.
    navigate({ to: "/home", replace: true })
  }

  const isLoading = status.kind === "loading"
  const mismatch = confirmation.length > 0 && confirmation !== password
  const canSubmit = password.length > 0 && !mismatch && !isLoading

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSubmit) {
      void savePassword()
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">easywed.</h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.reset_subtitle")}
          </p>
        </div>

        {!isReady && (
          <p className="text-sm text-muted-foreground">
            {t("auth.reset_link_checking")}
          </p>
        )}

        {isReady && !hasSession && (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {t("auth.reset_link_invalid_title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("auth.reset_link_invalid_body")}
              </p>
            </div>
            <Button asChild>
              <Link to="/forgot-password">
                {t("auth.request_new_reset_link")}
              </Link>
            </Button>
          </>
        )}

        {isReady && hasSession && (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t("auth.new_password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmation">
                  {t("auth.confirm_password")}
                </Label>
                <Input
                  id="confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
                {mismatch && (
                  <p className="text-xs text-destructive">
                    {t("auth.passwords_dont_match")}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={!canSubmit}>
                {t("auth.set_new_password")}
              </Button>
            </form>

            {/* Length and strength are the server's call - config.toml sets
                minimum_password_length and password_requirements, and
                duplicating either here would drift the moment one changes. */}
            {status.kind === "error" && (
              <p className="text-sm text-destructive">{status.message}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
