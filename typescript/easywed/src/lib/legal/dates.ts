import type { Lang } from "@/components/landing/LocaleLanding"

// The dates the legal documents carry. ISO here, formatted per locale at
// render time - keeping the prose date in the locale files means bumping a
// version and forgetting the other language, which is how a document ends up
// claiming two different effective dates.
//
// TODO: set both to the real launch date BEFORE publishing, not after.
//
// `termsEffective` is the date the Regulamin starts binding and § 17 ust. 1
// restates it in the prose, so a wrong date is a wrong contract. It is also
// TERMS_VERSION, which every sign-up records in profiles.terms_version - so
// moving it after launch splits users into two recorded versions with no
// § 16 notice behind the split, and leaves the earlier group holding a version
// that was never published under that date. Changing it later means running
// the § 16 ust. 2 change procedure (notify by email, 14 days to object), not
// editing this line.
export const LEGAL_DATES = {
  termsEffective: "2026-08-06",
  privacyUpdated: "2026-08-06",
} as const

/**
 * What gets recorded in `profiles.terms_version` when a user accepts at sign-up.
 *
 * The effective date *is* the version: § 16 ust. 3 makes a changed Regulamin
 * binding 14 days after notice, so every substantive change moves this date,
 * and a separate version counter would only be one more thing to forget.
 */
export const TERMS_VERSION = LEGAL_DATES.termsEffective

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
