import { useState } from "react"
import { useTranslation } from "react-i18next"
import { acceptTerms } from "@/lib/sync/termsAcceptance"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { TermsConsentText } from "@/components/auth/TermsConsentText"

/**
 * The half-finished sign-up.
 *
 * signInWithOAuth is one call for "sign in" and "sign up" - Google has no
 * notion of which button was pressed, and neither does Supabase - so a brand
 * new account can be created from the login form, which has no consent
 * checkbox. Rather than trying to veto the account creation (the
 * before-user-created hook sees no signal that would let it tell the two forms
 * apart), the account exists but the app stays closed until the acceptance the
 * sign-up form would have collected is on record.
 *
 * Unticked by default, and declining signs the user out: the box being the
 * cost of entry is what makes ticking it an affirmative act rather than a
 * formality.
 */
export function AcceptTermsStep({
  userId,
  onAccepted,
  onDeclined,
}: {
  userId: string
  onAccepted: () => void
  onDeclined: () => void
}) {
  const { t } = useTranslation()
  const [accepted, setAccepted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setIsSaving(true)
    setError(null)

    const { error: saveError } = await acceptTerms(userId)

    if (saveError) {
      setIsSaving(false)
      setError(t("auth.terms_gate_failed"))
      return
    }

    onAccepted()
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            {t("auth.terms_gate_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.terms_gate_body")}
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox
            id="gate-accept-terms"
            checked={accepted}
            onCheckedChange={(value) => setAccepted(value === true)}
            disabled={isSaving}
            className="mt-0.5"
          />
          {/* block, because Label is flex by default - that would make every
              <Trans> segment its own flex item instead of one sentence. */}
          <Label
            htmlFor="gate-accept-terms"
            className="block text-xs leading-relaxed font-normal text-muted-foreground"
          >
            <TermsConsentText />
          </Label>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => void submit()}
            disabled={!accepted || isSaving}
          >
            {t("auth.terms_gate_accept")}
          </Button>
          <Button variant="ghost" onClick={onDeclined} disabled={isSaving}>
            {t("auth.sign_out")}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
