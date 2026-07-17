import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { VenueHero } from "./VenueHero"
import { VenueFeatures } from "./VenueFeatures"
import { VenueSteps } from "./VenueSteps"
import { VenuePricing } from "./VenuePricing"
import { VenueCta } from "./VenueCta"
import { salesMailto } from "./salesMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { Button } from "@/components/ui/button"
import i18n from "@/i18n"

// B2B landing for wedding venue owners (/pl/venues, /en/venues). Same
// locale-pinned rendering rules as LocaleLanding: text renders with an
// explicit `lng` for stable SSR output, and the global i18n language syncs
// on the client.
export function VenueLanding({ lang }: { lang: Lang }) {
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
                to="/pl/venues"
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
                to="/en/venues"
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
              <a href={salesMailto(lang)}>
                {t("venues.contact_sales", { lng: lang })}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <VenueHero lang={lang} />
        <VenueFeatures lang={lang} />
        <VenueSteps lang={lang} />
        <VenuePricing lang={lang} />
        <VenueCta lang={lang} />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>
            <span className="font-heading font-semibold text-foreground">
              easywed.
            </span>{" "}
            — {t("landing.footer.tagline", { lng: lang })}
          </p>
          <nav className="flex items-center gap-6">
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
