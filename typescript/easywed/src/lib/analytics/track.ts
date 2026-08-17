import posthog from "posthog-js"
import type { TableShape } from "@/stores/planner.store"

/**
 * Every product event this app sends, and the exact properties it may carry.
 *
 * This map is the replacement for autocapture, which `__root.tsx` turns off.
 * Autocapture reports the text of whatever element was clicked, and in the
 * planner that text is a wedding guest's name - a third party who never agreed
 * to anything and has no relationship with us. `privacy.data.usage`
 * promises only "zdarzenia produktowe (odwiedzone ekrany, uzyte funkcje)":
 * $pageview covers the screens, this covers the features.
 *
 * The type is closed rather than `Record<string, unknown>` on purpose. Every
 * property below is written by us, so nothing a user typed - a guest, table,
 * hall or wedding name, a note, an AI prompt - can reach the event store by
 * accident. Counts, enums and booleans only; if a new event needs a string,
 * it has to be a literal union declared here.
 */
export type AnalyticsEvents = {
  /** A signed-in user created an empty wedding from the wedding list. */
  wedding_created: { source: "wedding_list" }
  /** A guest-mode plan in localStorage was adopted into an account. */
  local_wedding_migrated: {
    halls: number
    tables: number
    guests: number
    reminders: number
  }
  /**
   * One table placed. Fires for every route to a new table - the add hub, a
   * canvas drop, a paste, and the AI's `addTable` tool - so it counts tables
   * created, not clicks on a particular button.
   */
  table_added: { shape: TableShape }
  /**
   * The batch-add form. `created` can fall short of `requested`: the grid
   * skips cells that poke outside a polygon hall's outline.
   */
  tables_batch_added: {
    shape: TableShape
    requested: number
    created: number
  }
  /**
   * One guest typed in by hand. Imports report `guests_imported` instead.
   *
   * `age_group` is bucketed rather than sent verbatim, and dietary tags are
   * only counted: both are free text the user types (see MAX_AGE_GROUP_LENGTH
   * and the `Dietary` alias), so the raw values are exactly the kind of
   * user-authored string this map exists to keep out.
   */
  guest_added: {
    dietary_count: number
    age_group: "adult" | "preset" | "custom"
  }
  /**
   * A CSV/XLSX import that persisted. `skipped` are blank-name rows,
   * `overflowed` are guests whose named table was already full.
   */
  guests_imported: {
    format: "csv" | "xlsx"
    row_count: number
    imported: number
    skipped: number
    overflowed: number
    seated: number
  }
  /** The guest list downloaded as a CSV file. */
  guests_exported: {
    mode: "flat" | "grouped"
    field_count: number
    guest_count: number
  }
  /** The plan sent to the print dialog (which is also how PDF export works). */
  plan_printed: {
    trigger: "export_dialog" | "keyboard_shortcut"
    include_seats: boolean
  }
  /** One guest put in one chair. */
  guest_seated: {
    source: "canvas_seat" | "guest_list"
    /** Whether this bumped whoever was already in that chair. */
    displaced: boolean
  }
  /** A message sent to the AI planner. Never the message itself. */
  ai_chat_message_sent: { source: "composer" | "suggestion" }
  reminder_created: { has_due_date: boolean }
  /** An invite link redeemed into a membership. */
  invite_claimed: undefined
  /**
   * A wedding was pointed at a venue and is now waiting on the couple. Not a
   * disclosure - `pending` shows the venue nothing.
   *
   * `source` is a literal union rather than free text for the reason the whole
   * map exists: the venue's slug is a name someone chose, and the venue itself
   * is attributed with a PostHog **group**, never an event property. See
   * `identifyTenantGroup` below.
   *
   * "venue" is declared and not yet emitted: the CRM-initiated request arrives
   * with the customer roster. Keeping it in the union now means the property
   * never has to widen from one value to two after the fact, which is the
   * change that quietly reshapes an existing PostHog insight.
   */
  venue_access_requested: { source: "couple" | "venue" }
  /**
   * The couple gave a linked venue access to the seat map. This is the
   * art. 9(2)(a) consent moment, so the event deliberately carries nothing
   * about *what* was shared - the answer is fixed, and it is in the policy.
   */
  venue_access_granted: undefined
  /** Venue staff opened one customer's seat map in the CRM. */
  venue_peek_opened: undefined
}

// Events declared as `undefined` are called bare - `track("invite_claimed")`.
// Everything else has to pass its whole property object, which is what makes a
// forgotten property a type error here rather than a column that silently
// stops arriving in PostHog.
type TrackArgs<TEvent extends keyof AnalyticsEvents> =
  AnalyticsEvents[TEvent] extends undefined
    ? [event: TEvent]
    : [event: TEvent, properties: AnalyticsEvents[TEvent]]

/**
 * Sends one product event.
 *
 * Called from stores and plain modules as well as components, so it reaches
 * for the `posthog-js` default singleton rather than the React context -
 * `PostHogProvider` initializes that same instance when it's given an `apiKey`
 * (see `getDefaultPostHogInstance` in @posthog/react), so the two agree.
 *
 * The `__loaded` guard is what keeps this callable from anywhere: these code
 * paths also run during SSR and under vitest, where `init` never happened and
 * every `capture` would otherwise warn.
 */
export const track = <TEvent extends keyof AnalyticsEvents>(
  ...args: TrackArgs<TEvent>
): void => {
  const [event, properties] = args as [
    TEvent,
    AnalyticsEvents[TEvent] | undefined,
  ]
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}

/**
 * Attributes the current session to a tenant, as a PostHog **group**.
 *
 * A group rather than an event property, and the distinction is not stylistic.
 * A property has to be repeated on every event and would put the tenant id into
 * the payload of events that have nothing to do with the venue; a group is set
 * once per session and lets PostHog roll every subsequent event up by venue
 * without any event declaring it. It also keeps `AnalyticsEvents` closed - no
 * event above gains a string property to carry this.
 *
 * The **id** is the tenant's uuid, never its slug or its name: both of those
 * are things a person chose and typed, which is exactly what this module keeps
 * out of the event store. `name` is passed as a group property because that is
 * the one place a human-readable label is genuinely wanted - the venue is our
 * customer, not a third party who never agreed to anything, and the id alone
 * makes the dashboard unreadable.
 */
export const identifyTenantGroup = (tenantId: string, name: string): void => {
  if (!posthog.__loaded) return
  posthog.group("tenant", tenantId, { name })
}
