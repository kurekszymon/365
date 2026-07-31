import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import type { Lang } from "@/components/landing/LocaleLanding"
import i18n from "@/i18n"

// Section ids map to `privacy.<id>.*` i18n keys. Sections with `bullets`
// render `privacy.<id>.intro` + a list; the rest render `privacy.<id>.body`.
const SECTIONS: Array<{ id: string; bullets?: Array<string> }> = [
  { id: "controller" },
  {
    id: "data",
    bullets: [
      "account",
      "display_name",
      "content",
      "files",
      "usage",
      "local",
    ],
  },
  { id: "storage" },
  { id: "guest_mode" },
  { id: "ai" },
  {
    id: "sharing",
    bullets: ["supabase", "cloudflare", "posthog", "google", "ai"],
  },
  { id: "guests" },
  { id: "rights" },
  { id: "retention" },
  { id: "changes" },
]

// Language-pinned like LocaleLanding: explicit `lng` keeps the server render
// deterministic; the global language is synced on the client after mount.
export function PrivacyPolicy({ lang }: { lang: Lang }) {
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
            {t("privacy.back", { lng: lang })}
          </Link>
          <Link to="/" className="font-heading text-lg font-semibold">
            easywed.
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="font-heading text-4xl font-semibold">
          {t("privacy.title", { lng: lang })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("privacy.updated", { lng: lang })}
        </p>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          {t("privacy.intro", { lng: lang })}
        </p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map(({ id, bullets }) => (
            <section key={id} className="space-y-3">
              <h2 className="font-heading text-2xl font-semibold">
                {t(`privacy.${id}.title`, { lng: lang })}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t(`privacy.${id}.${bullets ? "intro" : "body"}`, {
                  lng: lang,
                })}
              </p>
              {bullets && (
                <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
                  {bullets.map((bullet) => (
                    <li key={bullet}>
                      {t(`privacy.${id}.${bullet}`, { lng: lang })}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
