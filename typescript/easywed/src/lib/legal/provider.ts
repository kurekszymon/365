import type { Lang } from "@/components/landing/LocaleLanding"
import { LEGAL_DATES, formatLegalDate } from "@/lib/legal/dates"

// Single source of truth for the seller identity that both legal documents
// (Regulamin, Polityka prywatności) interpolate into their text. Kept out of
// the locale files on purpose: these values are identical in every language,
// and duplicating them across en.json/pl.json is how they drift.
//
// TODO: replace every `[...]` placeholder before publishing. Art. 8 ust. 1
// pkt 1 UŚUDE and art. 12 Ustawy o prawach konsumenta require the trader's
// identifying and contact details to be complete and accurate.
export const PROVIDER = {
  /** Full name of the natural person running the sole proprietorship. */
  name: "[IMIĘ I NAZWISKO]",
  /** Registered business name as it appears in CEIDG. */
  company: "[NAZWA FIRMY]",
  /** Fixed place of business: street, number, postcode, city. */
  address: "[ULICA I NUMER, KOD POCZTOWY MIASTO]",
  nip: "[NIP]",
  regon: "[REGON]",
  /**
   * The statutory contact address: complaints, RODO requests, withdrawal
   * declarations, DSA point of contact. Everything the documents route
   * somewhere routes here unless it is a Venue Plan enquiry.
   */
  email: "support@easywed.app",
  /** Venue Plan enquiries and the data processing agreement that goes with it. */
  salesEmail: "sales@easywed.app",
  /**
   * The address notices and transactional mail are sent *from*. Named in § 1
   * ust. 9 so a Regulamin change or a termination notice landing in spam is
   * one the User was told to expect.
   */
  outboundEmail: "szymon@easywed.app",
  /** Expected by art. 12 ust. 1 pkt 2 UPK when contracting with consumers. */
  phone: "[NUMER TELEFONU]",
} as const

/**
 * Interpolation values for `t()` calls inside the legal documents. Takes the
 * language because the dates are formatted per locale - everything else is
 * language-independent.
 */
export function legalVars(lang: Lang) {
  return {
    provider_name: PROVIDER.name,
    provider_company: PROVIDER.company,
    provider_address: PROVIDER.address,
    provider_nip: PROVIDER.nip,
    provider_regon: PROVIDER.regon,
    provider_email: PROVIDER.email,
    provider_sales_email: PROVIDER.salesEmail,
    provider_outbound_email: PROVIDER.outboundEmail,
    provider_phone: PROVIDER.phone,
    effective_date: formatLegalDate(LEGAL_DATES.termsEffective, lang),
    updated_date: formatLegalDate(LEGAL_DATES.privacyUpdated, lang),
  }
}
