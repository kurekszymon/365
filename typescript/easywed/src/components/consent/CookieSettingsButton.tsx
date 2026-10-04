import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { useConsentStore } from "@/stores/consent.store"

type Props = {
  className?: string
  /** Pinned language, for the prerendered landings that render with `lng`. */
  lng?: string
  /** Rendered before the label - the settings row puts an icon here. */
  children?: ReactNode
}

/**
 * Re-opens the cookie banner. Withdrawing consent has to be as easy as giving
 * it (art. 7(3) GDPR), so this sits wherever the privacy policy is linked from.
 */
export const CookieSettingsButton = ({ className, lng, children }: Props) => {
  const { t } = useTranslation()
  const openSettings = useConsentStore((s) => s.openSettings)

  return (
    <button type="button" onClick={openSettings} className={className}>
      {children}
      {t("consent.settings", { lng })}
    </button>
  )
}
