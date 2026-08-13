import { useTranslation } from "react-i18next"
import type { Lang } from "@/components/landing/LocaleLanding"
import { RELEASES } from "@/components/changelog/releases"
import { LegalPageShell } from "@/components/legal/LegalPageShell"
import { formatLegalDate } from "@/lib/legal/dates"

/**
 * What changed, newest first. Language-pinned like the legal documents: every
 * `t()` call carries an explicit `lng` so the prerendered HTML is deterministic.
 *
 * Reuses `LegalPageShell` for the chrome (back link, centred column) and
 * `formatLegalDate` for the dates - both are generic page furniture that happen
 * to live under `legal/`, and a second copy of either is how the two drift.
 */
export function Changelog({ lang }: { lang: Lang }) {
  // Bound to the `changelog` namespace, so the keys here are the bare ones from
  // src/i18n/locales/changelog - see i18n/index.ts for why it is separate.
  const { t } = useTranslation("changelog")
  const tr = (key: string) => t(key, { lng: lang })

  return (
    <LegalPageShell lang={lang} title={tr("title")} updated={tr("subtitle")}>
      <div className="mt-10 space-y-12">
        {RELEASES.map(({ id, version, date, items }) => (
          <section key={id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                v{version}
              </span>
              <time dateTime={date} className="text-sm text-muted-foreground">
                {formatLegalDate(date, lang)}
              </time>
            </div>

            <h2 className="font-heading text-2xl font-semibold">
              {tr(`${id}.title`)}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {tr(`${id}.summary`)}
            </p>

            <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
              {Array.from({ length: items }, (_, i) => (
                <li key={i}>{tr(`${id}.i${i + 1}`)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LegalPageShell>
  )
}
