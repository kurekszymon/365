// Everything about the legal documents that is a decision rather than prose:
// the trader's identity, the dates the documents bind from, and the operational
// facts the Polityka prywatności asserts. One file, because these values are the
// pre-launch checklist - `scripts/check-legal-placeholders.mjs` reads it and
// blocks `deploy:pages` until every `[PLACEHOLDER]` is gone and `launchReviewed`
// is true.
//
// Importing this directly is expected. `provider.ts` and `dates.ts` exist
// because they *do* something with these values, not because they are a
// boundary, so there stays exactly one name per value.

export const LEGAL_CONFIG = {
  /**
   * The trader, as art. 8 ust. 1 pkt 1 UŚUDE, art. 12 UPK and art. 13 RODO
   * require them to be identified. Public record in CEIDG, so it lives in the
   * repo rather than in env: identical in every environment, reviewable in git
   * history alongside the Regulamin, and a VITE_ variable would be inlined into
   * the client bundle anyway.
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
     * declarations, DSA point of contact - everything except Venue Plan
     * enquiries. Nothing can verify this mailbox exists and is monitored; it has
     * to, before the documents naming it are published.
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
   * time - a prose date in the locale files is how a document ends up claiming
   * two different effective dates.
   *
   * These carry no `[PLACEHOLDER]`, so the scan cannot catch a wrong one;
   * `launchReviewed` stands in for that.
   *
   * `termsEffective` is the date the Regulamin starts binding, restated in § 17
   * ust. 1, so a wrong date is a wrong contract. It is also TERMS_VERSION,
   * recorded in profiles.terms_version at every sign-up, so moving it after
   * launch splits users across two versions with no § 16 notice behind the
   * split. Changing it means running the § 16 ust. 2 procedure (notify by email,
   * 14 days to object), not editing this line.
   */
  dates: {
    /**
     * Bumped from 2026-08-15 for the v2 venue-link amendment (§ 14 ust. 4 said
     * the User must not enter art. 9 data at all, while the product now
     * discloses dietary tags to a linked Sala Weselna; § 14 ust. 3 had the
     * controller/processor direction backwards for that flow). § 16 ust. 3
     * makes a change effective 14 days after notification: notice goes out
     * 2026-08-16, so the earliest lawful effective date is 2026-08-31.
     *
     * Do not move this again without running § 16 ust. 2 from the top.
     */
    termsEffective: "2026-08-31",
    privacyUpdated: "2026-08-31",
    /**
     * The day the acceptance gate started running. A separate literal rather
     * than `termsEffective`: derived, it would absolve everyone who dodged the
     * previous version the day a new one is published. Accounts created before
     * this are grandfathered - § 16 ust. 2 is their route, not a wall.
     */
    enforcedSince: "2026-08-15",
  },

  /**
   * Operational facts the Polityka prywatności states as fact. Language
   * independent, so they live here - but the prose spells them out too, and
   * `check-legal-placeholders.mjs` asserts pl.json and en.json agree with this,
   * naming the sentences to update when a value changes.
   */
  infra: {
    /** Where the hosted Supabase project runs. Inside the EEA - see § transfers. */
    supabaseRegion: "eu-west-3",
    /** PostHog free-plan event retention. 7 years on any paid plan. */
    analyticsRetentionMonths: 12,
    /**
     * Null means no database backups exist - the Supabase Free plan: no daily
     * backups, no PITR. The privacy policy says deletion is immediate and
     * irreversible on that basis.
     *
     * Setting a number means backups exist, and `privacy.retention.backups` has
     * to be rewritten in both languages to name the period; the check enforces
     * that.
     *
     * What null costs: with no restore path, a disk incident loses every user's
     * plan permanently - the availability obligation in art. 32 ust. 1 lit. c
     * RODO.
     */
    backupRetentionDays: null as number | null,
  },

  /**
   * Flipped to true by a human who has read this whole file and confirmed every
   * value is the one that should be printed in a binding document. The
   * placeholder scan catches fields nobody filled in; it cannot catch a field
   * filled in wrongly - a stale effective date, an address from before a move.
   *
   * Currently false: the v2 venue-link amendment is in flight. `legal:check`
   * fails while it is, blocking `deploy:pages` until a human has re-read the
   * amended Regulamin and Polityka, confirmed the § 16 ust. 2 notice went out,
   * and confirmed the 14 days have run. Flip back to true only then.
   */
  launchReviewed: false,
} as const
