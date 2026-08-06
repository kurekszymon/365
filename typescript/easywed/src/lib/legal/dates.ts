import type { Lang } from "@/components/landing/LocaleLanding"

// The dates the legal documents carry. ISO here, formatted per locale at
// render time - keeping the prose date in the locale files means bumping a
// version and forgetting the other language, which is how a document ends up
// claiming two different effective dates.
//
// TODO: set both before publishing; `termsEffective` is the date the Regulamin
// starts binding, and § 17 ust. 1 restates it.
export const LEGAL_DATES = {
  termsEffective: "2026-08-06",
  privacyUpdated: "2026-08-06",
} as const

const LOCALE = { pl: "pl-PL", en: "en-GB" } as const

/** "6 sierpnia 2026" / "6 August 2026" - deterministic across SSR and client. */
export function formatLegalDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`))
}
