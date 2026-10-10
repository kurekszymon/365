import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Lang } from "@/components/landing/LocaleLanding"
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton"
import { LegalPageShell } from "@/components/legal/LegalPageShell"
import { PRIVACY_SECTIONS } from "@/components/legal/legalStructure"
import { legalVars } from "@/lib/legal/provider"

export function PrivacyPolicy({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  // One object for every `t()` call on the page - see TermsOfService, which
  // does the same thing across a document five times this size.
  const options = useMemo(() => ({ lng: lang, ...legalVars(lang) }), [lang])
  const tr = (key: string) => t(key, options)

  return (
    <LegalPageShell
      lang={lang}
      title={tr("privacy.title")}
      updated={tr("privacy.updated")}
    >
      {/* The policy tells readers to change their choice here, so the page
          that says so has to offer it too. Kept out of LegalPageShell, which
          the terms and the changelog share. */}
      <CookieSettingsButton
        lng={lang}
        className="mt-1 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      />

      <p className="mt-6 leading-relaxed text-muted-foreground">
        {tr("privacy.intro")}
      </p>

      <div className="mt-10 space-y-10">
        {PRIVACY_SECTIONS.map(({ id, bullets }) => (
          <section key={id} className="space-y-3">
            <h2 className="font-heading text-2xl font-semibold">
              {tr(`privacy.${id}.title`)}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {tr(`privacy.${id}.${bullets ? "intro" : "body"}`)}
            </p>
            {bullets && (
              <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
                {bullets.map((bullet) => (
                  <li key={bullet}>{tr(`privacy.${id}.${bullet}`)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </LegalPageShell>
  )
}
