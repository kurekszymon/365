import type { Lang } from "@/components/landing/LocaleLanding"
import i18n from "@/i18n"

export const TRANSPORT_EMAIL = "transport@easywed.app"

// mailto: link for the transport CTAs. The body is a short template so the
// first message already carries what we need to quote: date, venue, cargo.
export function transportMailto(lang: Lang) {
  const subject = encodeURIComponent(
    i18n.t("transport.mail_subject", { lng: lang })
  )
  const body = encodeURIComponent(i18n.t("transport.mail_body", { lng: lang }))
  return `mailto:${TRANSPORT_EMAIL}?subject=${subject}&body=${body}`
}
