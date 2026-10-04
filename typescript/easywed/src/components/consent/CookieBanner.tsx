import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConsentStore } from "@/stores/consent.store"

/**
 * Asks once whether PostHog may use a cookie and record the session, and
 * again whenever "Cookie settings" re-opens it.
 *
 * Not modal: until there's an answer the visitor is treated as having said no
 * (see lib/analytics/consent.ts), so nothing is gained by blocking the page.
 * Accept and reject carry the same weight on purpose - a consent nudged by a
 * louder button is not the freely given one art. 4(11) GDPR asks for.
 *
 * Renders nothing while the store's status is `unknown`, which covers SSR, the
 * prerendered marketing HTML and the first client render - so it can sit in
 * the root layout without a hydration mismatch.
 */
export const CookieBanner = () => {
  const { t, i18n } = useTranslation()
  const status = useConsentStore((s) => s.status)
  const settingsOpen = useConsentStore((s) => s.settingsOpen)
  const accept = useConsentStore((s) => s.accept)
  const reject = useConsentStore((s) => s.reject)
  const closeSettings = useConsentStore((s) => s.closeSettings)

  if (status === "unknown") return null
  if (status !== "pending" && !settingsOpen) return null

  const isPolish = i18n.language.startsWith("pl")
  // Only offered once there is an answer to fall back on - a pending visitor
  // has to pick one, or the banner would come back on every page load.
  const dismissible = status !== "pending"

  return (
    <section
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-lg sm:right-auto sm:left-4 sm:max-w-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="cookie-banner-title" className="text-sm font-semibold">
          {/* Hidden from screen readers, which would announce it as
              "cookie" in English ahead of a Polish sentence. */}
          <span aria-hidden="true">🍪 </span>
          {t("consent.title")}
        </h2>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={closeSettings}
            aria-label={t("consent.close")}
          >
            <XIcon />
          </Button>
        )}
      </div>

      <p className="text-justify text-xs leading-relaxed text-muted-foreground">
        {t("consent.body")}{" "}
        <Link
          to={isPolish ? "/pl/privacy" : "/en/privacy"}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("consent.privacy_link")}
        </Link>
      </p>

      {dismissible && (
        <p className="text-xs text-muted-foreground">
          {t(
            status === "granted"
              ? "consent.current_granted"
              : "consent.current_denied"
          )}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={reject}>
          {t("consent.reject")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={accept}>
          {t("consent.accept")}
        </Button>
      </div>
    </section>
  )
}
