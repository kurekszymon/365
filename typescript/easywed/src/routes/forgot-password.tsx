import { useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
})

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string }

function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  // Supabase requires a full absolute URL, same as the /auth/callback one the
  // login and signup forms build. No ?next= rides along: the reset lands the
  // user on /home, so there is nothing to carry.
  const resetUrl = () =>
    new URL("/reset-password", window.location.origin).toString()

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    setStatus({ kind: "error", message })
  }

  const sendLink = async () => {
    setStatus({ kind: "loading" })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl(),
    })

    if (error) {
      return handleError(error)
    }

    setStatus({ kind: "success" })
  }

  const isLoading = status.kind === "loading"
  const canSubmit = email.length > 0 && !isLoading

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSubmit) {
      void sendLink()
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">easywed.</h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.forgot_subtitle")}
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

          <Button type="submit" disabled={!canSubmit}>
            {t("auth.send_reset_link")}
          </Button>
        </form>

        {/* Deliberately the same message whether or not that address has an
            account - anything else turns this form into a way to ask us which
            of a list of emails is a customer. Supabase already returns no error
            for an unknown address, so this only has to avoid inventing one.
            The errors below are transport and rate-limit failures, which say
            nothing about the address, so showing them is not the same leak. */}
        {status.kind === "success" && (
          <p className="text-sm text-green-600">{t("auth.reset_link_sent")}</p>
        )}
        {status.kind === "error" && (
          <p className="text-sm text-destructive">{status.message}</p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t("auth.back_to_sign_in")}
          </Link>
        </p>
      </div>
    </div>
  )
}
