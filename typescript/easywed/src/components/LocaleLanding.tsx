import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { Button } from "@/components/ui/button"

type Lang = "pl" | "en"

// Public, language-pinned landing used for shareable locale URLs (/pl, /en).
// Text renders with an explicit `lng` so the server output is deterministic
// (no dependency on the browser language detector, which is undefined on the
// server) and hydration stays stable. The global i18n language is synced on
// the client so navigating into the app keeps the chosen language; <html lang>
// is owned by the root shell (derived from the path).
export function LocaleLanding({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  useEffect(() => {
    void i18n.changeLanguage(lang)
  }, [lang])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          {t("seo.title", { lng: lang })}
        </h1>
        <p className="text-muted-foreground">
          {t("seo.description", { lng: lang })}
        </p>
        <Button asChild>
          <Link to="/">{t("landing.cta", { lng: lang })}</Link>
        </Button>
      </div>
    </div>
  )
}
