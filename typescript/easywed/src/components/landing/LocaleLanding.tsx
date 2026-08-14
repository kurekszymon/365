import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LandingHero } from "./LandingHero"
import { LandingFeatures } from "./LandingFeatures"
import { LandingSteps } from "./LandingSteps"
import { LandingCta } from "./LandingCta"
import { VenueOwnersBanner } from "./VenueOwnersBanner"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth.store"
import i18n from "@/i18n"

export type Lang = "pl" | "en"

// Public, language-pinned landing used for shareable locale URLs (/pl, /en).
// Text renders with an explicit `lng` so the server output is deterministic
// (no dependency on the browser language detector, which is undefined on the
// server) and hydration stays stable. The global i18n language is synced on
// the client so navigating into the app keeps the chosen language; <html lang>
// is owned by the root shell (derived from the path).
export function LocaleLanding({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  // Session hydrates client-side (null on the server), so both server and the
  // first client render show "Sign in" - the label flips after hydration once
  // an authenticated session is known, keeping SSR/hydration output stable.
  const isSignedIn = useAuthStore((s) => s.isReady && s.session !== null)

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
                to="/pl"
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
                to="/en"
                className={
                  lang === "en"
                    ? "text-foreground"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                EN
              </Link>
            </nav>
            <Button asChild variant="outline" size="sm">
              {isSignedIn ? (
                <Link to="/home">{t("auth.go_to_app", { lng: lang })}</Link>
              ) : (
                <Link to="/login">{t("auth.sign_in", { lng: lang })}</Link>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero lang={lang} />
        <LandingFeatures lang={lang} />
        <LandingSteps lang={lang} />
        <VenueOwnersBanner lang={lang} />
        <LandingCta lang={lang} />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>
            <span className="font-heading font-semibold text-foreground">
              easywed.
            </span>{" "}
            - {t("landing.footer.tagline", { lng: lang })}
          </p>
          <nav className="flex items-center gap-6">
            <Link
              to={lang === "pl" ? "/pl/venues" : "/en/venues"}
              className="transition-colors hover:text-foreground"
            >
              {t("landing.footer.venues", { lng: lang })}
            </Link>
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
            <span suppressHydrationWarning>
              © {new Date().getUTCFullYear()} easywed.
            </span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
