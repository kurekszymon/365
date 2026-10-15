import { Link } from "@tanstack/react-router"
import { Trans, useTranslation } from "react-i18next"

import { localeDocPath } from "@/lib/site"

/**
 * "I accept the <terms> and confirm I have read the <privacy>."
 *
 * Shared by the sign-up form's checkbox label and the /accept-terms gate: both
 * are the same consent moment, so the wording - and the documents it points
 * at - must be identical on either path.
 */
export function TermsConsentText() {
  const { i18n } = useTranslation()

  return (
    <Trans
      i18nKey="auth.accept_terms"
      components={{
        terms: (
          <Link
            to={localeDocPath("terms", i18n.language)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          />
        ),
        privacy: (
          <Link
            to={localeDocPath("privacy", i18n.language)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          />
        ),
      }}
    />
  )
}
