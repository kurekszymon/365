import type { Lang } from "@/components/landing/LocaleLanding"
import { LEGAL_CONFIG } from "@/lib/legal/config"

// The dates the legal documents carry, and the formatter that renders them.
// ISO in config.ts, formatted per locale here - keeping the prose date in the
// locale files means bumping a version and forgetting the other language,
// which is how a document ends up claiming two different effective dates.
//
// See config.ts for what moving any of these actually costs.
export const LEGAL_DATES = {
  termsEffective: LEGAL_CONFIG.dates.termsEffective,
  privacyUpdated: LEGAL_CONFIG.dates.privacyUpdated,
} as const

/**
 * What gets recorded in `profiles.terms_version` when a user accepts at sign-up.
 *
 * The effective date *is* the version: § 16 ust. 3 makes a changed Regulamin
 * binding 14 days after notice, so every substantive change moves this date,
 * and a separate version counter would only be one more thing to forget.
 */
export const TERMS_VERSION = LEGAL_DATES.termsEffective

export const TERMS_ENFORCED_SINCE = LEGAL_CONFIG.dates.enforcedSince

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
