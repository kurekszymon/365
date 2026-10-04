import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import type { Lang } from "@/components/landing/LocaleLanding"
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton"
import i18n from "@/i18n"

// Chrome shared by the legal documents (privacy policy, terms of service).
// Language-pinned like LocaleLanding: the explicit `lng` on every `t()` call in
// the documents keeps the server render deterministic, and the global language
// is synced on the client after mount.
export function LegalPageShell({
  lang,
  title,
  updated,
  children,
}: {
  lang: Lang
  title: string
  updated: string
  children: ReactNode
}) {
  const { t } = useTranslation()

  useEffect(() => {
    void i18n.changeLanguage(lang)
  }, [lang])

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6">
          <Link
            to={lang === "pl" ? "/pl" : "/en"}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("legal.back", { lng: lang })}
          </Link>
          <Link to="/" className="font-heading text-lg font-semibold">
            easywed.
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="font-heading text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{updated}</p>
        {/* The policy tells readers to change their choice here, so the page
            that says so has to offer it too. */}
        <CookieSettingsButton
          lng={lang}
          className="mt-1 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        />
        {children}
      </main>
    </div>
  )
}
