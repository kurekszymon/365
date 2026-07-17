import type { Lang } from "@/components/landing/LocaleLanding"
import i18n from "@/i18n"

export const SALES_EMAIL = "sales@easywed.app"

// mailto: link for the "Contact sales" CTAs, with a localized subject so
// enquiries arrive pre-tagged by language.
export function salesMailto(lang: Lang) {
  const subject = encodeURIComponent(
    i18n.t("venues.mail_subject", { lng: lang })
  )
  return `mailto:${SALES_EMAIL}?subject=${subject}`
}
