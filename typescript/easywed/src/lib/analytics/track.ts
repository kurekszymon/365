import posthog from "posthog-js"
import type {
  FixtureShape,
  HallPreset,
  TableShape,
} from "@/stores/planner.store"

/**
 * Every product event this app sends, and the exact properties it may carry.
 *
 * This map is the replacement for autocapture, which `__root.tsx` turns off.
 * Autocapture reports the text of whatever element was clicked, and in the
 * planner that text is a wedding guest's name - a third party who never agreed
 * to anything and has no relationship with us. `privacy.data.analytics`
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
  /**
   * A table or fixture deleted from the canvas (the selected item's trash
   * button or the context menu) - the deletes that offer an Undo toast. The
   * AI's deletes go through a confirmation instead and aren't counted, so
   * this is the denominator for `entity_delete_undone`.
   */
  entity_deleted: {
    kind: "table" | "fixture"
    source: "action_button" | "context_menu"
  }
  /**
   * The Undo on a delete's toast, counted only when the restore went through.
   * `seconds` is how long after the delete it was pressed - bunching near the
   * toast's 6s lifetime would mean the toast closes too soon.
   */
  entity_delete_undone: {
    kind: "table" | "fixture"
    source: "action_button" | "context_menu"
    seconds: number
  }
  /**
   * An invite link created in the members dialog. The denominator for
   * `invite_claimed` - without it a low claim count can't tell "nobody
   * shares" from "invitees don't follow through".
   */
  invite_created: { role: "editor" | "viewer" }
  /** An invite link redeemed into a membership. */
  invite_claimed: undefined
  /**
   * An account created from the sign-up page. For email that's signUp()
   * succeeding - the account exists, its address not yet confirmed. For Google
   * it's the first return from the OAuth round trip with a brand-new account
   * (the moment the pending terms acceptance gets written), so a Google user
   * who already had an account isn't counted. A Google account first created
   * from /login isn't either: that form carries no terms checkbox, so there is
   * no marker to notice it by.
   */
  signup_completed: { method: "email" | "google" }
  /** One hall created. Like `table_added`, counted in the store. */
  hall_added: { preset: HallPreset }
  /**
   * One fixture placed - the add hub, a canvas drop, a paste or the AI, as
   * with `table_added`.
   */
  fixture_added: { shape: FixtureShape }
  /**
   * A cloud write that failed (the "couldn't save" toast). There's no
   * rollback, so each one is a moment the screen and the database disagree
   * until the next load. `entity` is bucketed from the mutation's label;
   * `offline` separates a dropped connection from a real bug.
   */
  sync_save_failed: {
    entity:
      | "wedding"
      | "hall"
      | "table"
      | "fixture"
      | "guest"
      | "reminder"
      | "layout"
      | "other"
    offline: boolean
  }
  /**
   * The outline editor opened for a hall or fixture. Counted on opening rather
   * than saving: every vertex drag saves, so saves measure fiddliness, not use.
   */
  shape_edit_opened: { target: "hall" | "fixture" }
  /** One measurement line drawn; `snapped` is how many ends stuck to an object. */
  measure_added: { snapped: 0 | 1 | 2 }
  /** A copied table or fixture pasted. Also counts as `table_added`/`fixture_added`. */
  entity_pasted: {
    kind: "table" | "fixture"
    trigger: "keyboard" | "context_menu"
  }
  /** The duplicate button on a selected table or fixture. */
  entity_duplicated: { kind: "table" | "fixture" }
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
