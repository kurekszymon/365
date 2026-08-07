import type { Lang } from "@/components/landing/LocaleLanding"
import { LEGAL_CONFIG } from "@/lib/legal/config"
import { LEGAL_DATES, formatLegalDate } from "@/lib/legal/dates"

/**
 * Interpolation values for `t()` calls inside the legal documents.
 *
 * The seller identity is kept out of the locale files on purpose: these values
 * are identical in every language, and duplicating them across en.json/pl.json
 * is how they drift. They live in config.ts, next to the dates and the
 * operational facts, so there is one file to review before publishing - and
 * one name for each of them.
 *
 * Takes the language because the dates are formatted per locale; everything
 * else is language-independent.
 */
export function legalVars(lang: Lang) {
  const provider = LEGAL_CONFIG.provider

  return {
    provider_name: provider.name,
    provider_company: provider.company,
    provider_address: provider.address,
    provider_nip: provider.nip,
    provider_regon: provider.regon,
    provider_email: provider.email,
    provider_sales_email: provider.salesEmail,
    provider_outbound_email: provider.outboundEmail,
    provider_phone: provider.phone,
    effective_date: formatLegalDate(LEGAL_DATES.termsEffective, lang),
    updated_date: formatLegalDate(LEGAL_DATES.privacyUpdated, lang),
  }
}
