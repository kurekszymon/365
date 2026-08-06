// Structure of the two legal documents, kept apart from the components that
// render them so `legalKeys.test.ts` can check both locale files against it.
// A missing key in a legal document does not crash - it renders the raw key
// string into the contract - so the test is the only thing that catches it.

/**
 * A clause is either a plain paragraph (`terms.<section>.c<n>`) or a paragraph
 * followed by a numbered sub-list (`terms.<section>.c<n>.<1..count>`).
 */
export type Clause = string | [id: string, subItems: number]

export type TermsSection = {
  id: string
  /** Renders `terms.<id>.intro` above the list. */
  intro?: boolean
  /** Top-level marker style: "1." (default) or "1)" for the definitions list. */
  paren?: boolean
  clauses: Array<Clause>
}

// The document cross-references itself by number ("§ 1 ust. 5 pkt 1"), so the
// order here is load-bearing - inserting a section or clause renumbers every
// reference that points past it.
export const TERMS_SECTIONS: Array<TermsSection> = [
  {
    id: "general",
    clauses: ["c1", "c2", "c3", "c4", ["c5", 3], "c6", "c7", "c8", "c9"],
  },
  {
    id: "definitions",
    intro: true,
    paren: true,
    clauses: Array.from({ length: 19 }, (_, i) => `c${i + 1}`),
  },
  {
    id: "technical",
    clauses: [["c1", 4], ["c2", 5], "c3", "c4", "c5", "c6", "c7"],
  },
  {
    id: "contract",
    clauses: [
      "c1",
      "c2",
      ["c3", 3],
      ["c4", 4],
      "c5",
      "c6",
      "c7",
      "c8",
      "c9",
      "c10",
      "c11",
      "c12",
      "c13",
      ["c14", 2],
      ["c15", 3],
    ],
  },
  { id: "fees", clauses: ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] },
  {
    id: "complaints_consumer",
    clauses: [
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      ["c6", 4],
      "c7",
      ["c8", 3],
      "c9",
      "c10",
      ["c11", 5],
      "c12",
      ["c13", 5],
      "c14",
      "c15",
      "c16",
    ],
  },
  {
    id: "complaints_business",
    clauses: ["c1", "c2", "c3", ["c4", 3], "c5", ["c6", 3], "c7"],
  },
  { id: "withdrawal", clauses: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"] },
  {
    id: "content",
    clauses: [
      "c1",
      "c2",
      "c3",
      ["c4", 5],
      "c5",
      "c6",
      "c7",
      ["c8", 4],
      "c9",
      "c10",
      ["c11", 2],
      "c12",
      "c13",
      ["c14", 3],
      "c15",
      "c16",
    ],
  },
  { id: "ai", clauses: ["c1", "c2", "c3", "c4", ["c5", 3], "c6", "c7", "c8"] },
  {
    id: "liability",
    clauses: [
      "c1",
      "c2",
      "c3",
      "c4",
      ["c5", 3],
      ["c6", 4],
      "c7",
      "c8",
      "c9",
      "c10",
    ],
  },
  { id: "ip", clauses: [["c1", 4], "c2", "c3"] },
  { id: "disputes", clauses: ["c1", "c2", ["c3", 3]] },
  { id: "data", clauses: ["c1", "c2", "c3", "c4", "c5"] },
  {
    id: "service_changes",
    clauses: ["c1", ["c2", 3], "c3", "c4", ["c5", 2], "c6", "c7", "c8"],
  },
  {
    id: "terms_changes",
    clauses: [["c1", 4], "c2", "c3", "c4", "c5", "c6"],
  },
  { id: "final", clauses: ["c1", "c2", "c3", "c4", "c5"] },
]

// The model withdrawal form (załącznik nr 2 to the Ustawa o prawach
// konsumenta), which art. 12 ust. 1 pkt 9 requires the trader to supply rather
// than just cite. Rendered after the last § as an appendix - it isn't a section
// of the contract and carries no § number of its own.
export const TERMS_APPENDIX = { id: "withdrawal_form", lines: 8 } as const

// Sections with `bullets` render `privacy.<id>.intro` + a list; the rest
// render `privacy.<id>.body`.
export const PRIVACY_SECTIONS: Array<{ id: string; bullets?: Array<string> }> =
  [
    { id: "controller" },
    {
      id: "data",
      bullets: [
        "account",
        "display_name",
        "content",
        "dietary",
        "files",
        "usage",
        "local",
      ],
    },
    {
      id: "purposes",
      bullets: ["service", "account", "analytics", "security", "legal"],
    },
    { id: "storage" },
    { id: "transfers" },
    { id: "guest_mode" },
    { id: "ai" },
    {
      id: "sharing",
      bullets: ["supabase", "cloudflare", "posthog", "google", "ai"],
    },
    { id: "guests" },
    { id: "cookies" },
    {
      id: "retention",
      bullets: ["account", "wedding", "backups", "analytics", "local"],
    },
    {
      id: "rights",
      bullets: [
        "access",
        "rectification",
        "erasure",
        "restriction",
        "portability",
        "object",
        "withdraw",
        "complaint",
      ],
    },
    { id: "changes" },
  ]

/** Every i18n key both documents reference, for the locale-coverage test. */
export function legalI18nKeys(): Array<string> {
  const keys = [
    "terms.seo_title",
    "terms.seo_description",
    "terms.title",
    "terms.updated",
    "terms.toc",
    "terms.intro",
    "privacy.seo_title",
    "privacy.seo_description",
    "privacy.title",
    "privacy.updated",
    "privacy.intro",
    "legal.back",
  ]

  for (const section of TERMS_SECTIONS) {
    keys.push(`terms.${section.id}.title`)
    if (section.intro) keys.push(`terms.${section.id}.intro`)
    for (const clause of section.clauses) {
      const [id, subItems] = typeof clause === "string" ? [clause, 0] : clause
      keys.push(`terms.${section.id}.${id}`)
      for (let i = 1; i <= subItems; i++) {
        keys.push(`terms.${section.id}.${id}.${i}`)
      }
    }
  }

  keys.push(`terms.${TERMS_APPENDIX.id}.title`)
  keys.push(`terms.${TERMS_APPENDIX.id}.intro`)
  for (let i = 1; i <= TERMS_APPENDIX.lines; i++) {
    keys.push(`terms.${TERMS_APPENDIX.id}.l${i}`)
  }

  for (const { id, bullets } of PRIVACY_SECTIONS) {
    keys.push(`privacy.${id}.title`)
    keys.push(`privacy.${id}.${bullets ? "intro" : "body"}`)
    for (const bullet of bullets ?? []) keys.push(`privacy.${id}.${bullet}`)
  }

  return keys
}
