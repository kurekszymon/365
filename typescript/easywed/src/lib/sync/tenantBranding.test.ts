import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * The branding CHECK constraints from 20260817000001, asserted against a real
 * PostgreSQL.
 *
 * These three regexes are the entire CSS-injection guard for the values that
 * `tenantStyle`/`TenantWordmark` emit - the migration says so, and the client
 * component says so, and neither of those statements is enforcement. A venue
 * owner can UPDATE all four branding columns ("tenant owners can update their
 * tenant"), so the only thing standing between a tenant-authored string and
 * `element.style` is the database. That is testable, so it is tested here
 * rather than asserted in a comment.
 *
 * The regression this file exists for: `logo_url`'s pattern was originally
 * unanchored, and `~` searches rather than matches, so everything after the
 * first path slash was unvalidated - a `") ; background: url(...` tail passed.
 * The `breaks out of` cases below all failed against that version.
 *
 * Skipped, not failed, when the local stack is down, for the reason given in
 * venueRls.test.ts.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const BAGATELKA = "50000000-0000-4000-8000-000000000001"
const PASSWORD = "password123"

const reachable = await probeLocalStack()

// The CHECK is a constraint violation (23514), not an RLS refusal - PostgREST
// returns zero updated rows for either, so the tests assert on the code.
const CHECK_VIOLATION = "23514"

describe.skipIf(!reachable)("tenant branding constraints", () => {
  // Owner of `bagatelka`, and therefore the account that can write branding.
  // Explicitly optional, because afterAll runs even when beforeAll threw.
  let owner: SupabaseClient<Database> | undefined

  const setLogo = (logoUrl: string | null) => {
    if (!owner) throw new Error("owner client was never signed in")
    return owner
      .from("tenants")
      .update({ logo_url: logoUrl })
      .eq("id", BAGATELKA)
      .select("logo_url")
  }

  const setColor = (primaryColor: string) => {
    if (!owner) throw new Error("owner client was never signed in")
    return owner
      .from("tenants")
      .update({ primary_color: primaryColor })
      .eq("id", BAGATELKA)
      .select("primary_color")
  }

  beforeAll(async () => {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await supabase.auth.signInWithPassword({
      email: "venue@easywed.test",
      password: PASSWORD,
    })
    if (error) throw error
    owner = supabase
  })

  afterAll(async () => {
    // seed.sql leaves both tenants with a null logo; restore it so a later run
    // starts from the same fixture.
    if (owner) await setLogo(null)
  })

  describe("logo_url a venue owner can store", () => {
    it.each([
      "https://cdn.example.com/logo.png",
      "https://cdn.example.com/",
      "https://cdn.example.com/a/b/logo-2x.svg?v=3&fm=webp",
      "https://cdn.example.com/logo%20wide.png",
    ])("accepts %s", async (url) => {
      const { data, error } = await setLogo(url)
      expect(error).toBeNull()
      expect(data?.[0]?.logo_url).toBe(url)
    })
  })

  describe("logo_url that breaks out of a CSS or HTML context", () => {
    it.each([
      // The original report: valid prefix, arbitrary tail.
      'https://cdn.example.com/logo.png") ; background: url(https://evil/',
      // One character each of the classes the tail set excludes.
      "https://cdn.example.com/logo.png'",
      "https://cdn.example.com/logo.png<script>",
      "https://cdn.example.com/logo.png\\",
      "https://cdn.example.com/logo .png",
      "https://cdn.example.com/logo.png\n;color:red",
    ])("rejects %j", async (url) => {
      const { error } = await setLogo(url)
      expect(error?.code).toBe(CHECK_VIOLATION)
    })

    it("rejects a scheme that is not https, including a data URI", async () => {
      for (const url of [
        "data:image/svg+xml;base64,AAAA",
        "javascript:alert(1)",
        "http://cdn.example.com/logo.png",
      ]) {
        const { error } = await setLogo(url)
        expect(error?.code).toBe(CHECK_VIOLATION)
      }
    })
  })

  describe("the colour columns, which were already anchored", () => {
    it("rejects a colour carrying a second declaration", async () => {
      const { error } = await setColor("#ffffff;background:url(https://evil/x)")
      expect(error?.code).toBe(CHECK_VIOLATION)
    })
  })
})

async function probeLocalStack(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY },
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}
