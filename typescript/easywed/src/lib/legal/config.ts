// Everything about the legal documents that is a decision rather than prose.
//
// One file, because these values are the pre-launch checklist: the trader's
// identity, the dates the documents bind from, and the operational facts the
// Polityka prywatności asserts. Scattered across modules they get filled in
// one at a time and the last one is forgotten. `scripts/check-legal-
// placeholders.mjs` reads this file and blocks `deploy:pages` until every
// `[PLACEHOLDER]` is gone and `launchReviewed` is true.
//
// Importing this directly is fine and expected. `provider.ts` and `dates.ts`
// exist because they *do* something with these values - `legalVars()` maps them
// onto i18n interpolation names, `formatLegalDate()` renders a date per locale
// - not because they are a boundary. A value that needs neither treatment
// (salesMailto wanting the sales address) reads it from here rather than
// growing an alias, so there stays exactly one name per value.

export const LEGAL_CONFIG = {
  /**
   * The trader, as art. 8 ust. 1 pkt 1 UŚUDE, art. 12 UPK and art. 13 RODO
   * require them to be identified. All of it is public record in CEIDG - there
   * is nothing secret here, which is why it lives in the repo rather than in
   * env: it must be identical in every environment, it must be reviewable in
   * git history alongside the Regulamin it appears in, and a VITE_ variable
   * would be inlined into the client bundle anyway.
   */
  provider: {
    /** Full name of the natural person running the sole proprietorship. */
    name: "Szymon Kurek",
    /** Registered business name as it appears in CEIDG. */
    company: "Szymon Kurek",
    /** Fixed place of business: street, number, postcode, city. */
    address: "Czarnucha 6/132, 61-612 Poznań",
    nip: "6653048328",
    regon: "522102512",
    /**
     * The statutory contact address: complaints, RODO requests, withdrawal
     * declarations, DSA point of contact. Everything the documents route
     * somewhere routes here unless it is a Venue Plan enquiry.
     *
     * Nothing can verify this mailbox exists and is monitored. It has to,
     * before the documents naming it are published.
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
    phone: "+48 535 685 800",
  },

  /**
   * The dates the documents carry. ISO here, formatted per locale at render
   * time - keeping the prose date in the locale files means bumping a version
   * and forgetting the other language, which is how a document ends up
   * claiming two different effective dates.
   *
   * These carry no `[PLACEHOLDER]`, so the placeholder scan cannot catch a
   * wrong one. `launchReviewed` is what stands in for that: it exists because
   * a plausible-looking date is the most dangerous field in this file.
   *
   * `termsEffective` is the date the Regulamin starts binding and § 17 ust. 1
   * restates it in the prose, so a wrong date is a wrong contract. It is also
   * TERMS_VERSION, which every sign-up records in profiles.terms_version - so
   * moving it after launch splits users into two recorded versions with no
   * § 16 notice behind the split, and leaves the earlier group holding a
   * version that was never published under that date. Changing it later means
   * running the § 16 ust. 2 change procedure (notify by email, 14 days to
   * object), not editing this line.
   */
  dates: {
    termsEffective: "2026-08-10",
    privacyUpdated: "2026-08-10",
    /**
     * The day the acceptance gate started running. Deliberately a separate
     * literal rather than `termsEffective`: derived, it would silently absolve
     * everyone who dodged the previous version the day a new one is published.
     * Accounts created before this are grandfathered - § 16 ust. 2 is their
     * route, not a wall in front of the app.
     */
    enforcedSince: "2026-08-10",
  },

  /**
   * Operational facts the Polityka prywatności states as fact. Language
   * independent, so they belong here and not in the locale files - but the
   * prose still spells them out, so `check-legal-placeholders.mjs` asserts
   * that pl.json and en.json agree with what is written here. Change a value
   * and the check tells you which sentences to update.
   */
  infra: {
    /** Where the hosted Supabase project runs. Inside the EEA - see § transfers. */
    supabaseRegion: "eu-west-3",
    /** PostHog free-plan event retention. 7 years on any paid plan. */
    analyticsRetentionMonths: 12,
    /**
     * Null means no database backups exist, which is the current state on the
     * Supabase Free plan: no daily backups, no PITR. The privacy policy says
     * deletion is immediate and irreversible on that basis.
     *
     * Setting this to a number means backups now exist, and
     * `privacy.retention.backups` has to be rewritten in both languages to
     * name the period - the check enforces that rather than letting the two
     * drift apart.
     *
     * Worth knowing what null costs: with no restore path, a disk incident
     * loses every user's plan permanently, which is the availability
     * obligation in art. 32 ust. 1 lit. c RODO.
     */
    backupRetentionDays: null as number | null,
  },

  /**
   * Flipped to true by a human who has just read this whole file and confirmed
   * every value is the one that should be printed in a binding document.
   *
   * The placeholder scan only catches fields nobody filled in. It cannot catch
   * a field filled in wrongly - a stale effective date, last quarter's
   * retention figure, an address from before a move. This is the deliberate
   * pause in front of the one action that makes the documents binding.
   */
  launchReviewed: false,
} as const
