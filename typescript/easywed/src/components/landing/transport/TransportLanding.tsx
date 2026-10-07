import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { TransportHero } from "./TransportHero"
import { TransportCargo } from "./TransportCargo"
import { TransportSteps } from "./TransportSteps"
import { TransportCta } from "./TransportCta"
import { transportMailto } from "./transportMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton"
import { Button } from "@/components/ui/button"
import i18n from "@/i18n"

// Campaign page for the Poznań transport pilot (/pl/transport, /en/transport).
// Same locale-pinned rendering rules as LocaleLanding: text renders with an
// explicit `lng` for stable SSR output, and the global i18n language syncs
// on the client.
export function TransportLanding({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  useEffect(() => {
    void i18n.changeLanguage(lang)
  }, [lang])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="font-heading text-xl font-semibold">
            easywed.
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link
                to="/pl/transport"
                className={
                  lang === "pl"
                    ? "text-foreground"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                PL
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <Link
                to="/en/transport"
                className={
                  lang === "en"
                    ? "text-foreground"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                EN
              </Link>
            </nav>
            <Button asChild size="sm">
              <a href={transportMailto(lang)}>
                {t("transport.contact", { lng: lang })}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <TransportHero lang={lang} />
        <TransportCargo lang={lang} />
        <TransportSteps lang={lang} />
        <TransportCta lang={lang} />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p className="text-center sm:text-left">
            <span className="font-heading font-semibold text-foreground">
              easywed.
            </span>{" "}
            - {t("landing.footer.tagline", { lng: lang })}
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              to={lang === "pl" ? "/pl/changelog" : "/en/changelog"}
              className="transition-colors hover:text-foreground"
            >
              {t("landing.footer.changelog", { lng: lang })}
            </Link>
            <Link
              to={lang === "pl" ? "/pl/terms" : "/en/terms"}
              className="transition-colors hover:text-foreground"
            >
              {t("landing.footer.terms", { lng: lang })}
            </Link>
            <Link
              to={lang === "pl" ? "/pl/privacy" : "/en/privacy"}
              className="transition-colors hover:text-foreground"
            >
              {t("landing.footer.privacy", { lng: lang })}
            </Link>
            <CookieSettingsButton
              lng={lang}
              className="transition-colors hover:text-foreground"
            />
            <span suppressHydrationWarning>
              © {new Date().getUTCFullYear()} easywed.
            </span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
