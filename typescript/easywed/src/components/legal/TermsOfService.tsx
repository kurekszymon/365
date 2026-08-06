import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Lang } from "@/components/landing/LocaleLanding"
import { LegalPageShell } from "@/components/legal/LegalPageShell"
import { TERMS_SECTIONS } from "@/components/legal/legalStructure"
import { legalVars } from "@/lib/legal/provider"

export function TermsOfService({ lang }: { lang: Lang }) {
  const { t } = useTranslation()
  // One object for ~270 `t()` calls, not one per call.
  const vars = useMemo(() => legalVars(lang), [lang])
  const tr = (key: string) => t(key, { lng: lang, ...vars })

  return (
    <LegalPageShell
      lang={lang}
      title={tr("terms.title")}
      updated={tr("terms.updated")}
    >
      <p className="mt-6 leading-relaxed text-muted-foreground">
        {tr("terms.intro")}
      </p>

      <nav aria-label={tr("terms.toc")} className="mt-8 rounded-lg border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          {tr("terms.toc")}
        </h2>
        <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {TERMS_SECTIONS.map((section, i) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="transition-colors hover:text-foreground"
              >
                § {i + 1}. {tr(`terms.${section.id}.title`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {TERMS_SECTIONS.map((section, index) => (
          <section key={section.id} id={section.id} className="space-y-3">
            <h2 className="font-heading text-2xl font-semibold">
              <span className="text-muted-foreground">§ {index + 1}.</span>{" "}
              {tr(`terms.${section.id}.title`)}
            </h2>

            {section.intro && (
              <p className="leading-relaxed text-muted-foreground">
                {tr(`terms.${section.id}.intro`)}
              </p>
            )}

            <ol className="space-y-3 leading-relaxed text-muted-foreground">
              {section.clauses.map((clause, clauseIndex) => {
                const [id, subItems] =
                  typeof clause === "string" ? [clause, 0] : clause
                const marker = section.paren
                  ? `${clauseIndex + 1})`
                  : `${clauseIndex + 1}.`

                return (
                  <li key={id} className="flex gap-3">
                    <span className="shrink-0 tabular-nums">{marker}</span>
                    <div className="space-y-2">
                      <p>{tr(`terms.${section.id}.${id}`)}</p>
                      {subItems > 0 && (
                        <ol className="space-y-1.5">
                          {Array.from({ length: subItems }, (_, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="shrink-0 tabular-nums">
                                {i + 1})
                              </span>
                              <span>
                                {tr(`terms.${section.id}.${id}.${i + 1}`)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </LegalPageShell>
  )
}
