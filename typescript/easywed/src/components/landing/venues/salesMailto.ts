import type { Lang } from "@/components/landing/LocaleLanding"
import i18n from "@/i18n"
import { LEGAL_CONFIG } from "@/lib/legal/config"

// Same address § 5 of the Regulamin sends Venue Plan enquiries to - the CTA and
// the contract must not be able to disagree about where to write.
export const SALES_EMAIL = LEGAL_CONFIG.provider.salesEmail

// mailto: link for the "Contact sales" CTAs, with a localized subject so
// enquiries arrive pre-tagged by language.
export function salesMailto(lang: Lang) {
  const subject = encodeURIComponent(
    i18n.t("venues.mail_subject", { lng: lang })
  )
  return `mailto:${SALES_EMAIL}?subject=${subject}`
}
