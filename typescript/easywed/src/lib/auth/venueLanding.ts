/**
 * The one-shot marker that lets the apex send a venue's staff to their CRM.
 *
 * On a tenant host the decision is free - the hostname names the venue, so
 * `authLandingPath` can answer "/crm" with no round trip. The apex cannot: it
 * has no idea whether the account that just signed in runs a wedding hall until
 * it asks the database, and the answer only matters at one moment.
 *
 * Hence a marker rather than a check on every render of /home. Asking on every
 * visit would cost every existing couple a query for an answer that is "no",
 * and - worse - would trap the venue owner who also plans a wedding of their
 * own: every attempt to reach their own list would bounce them back to the CRM,
 * with no way to say "not this time". Armed at the auth surface, where "you
 * just arrived from signing in" is known for nothing, and spent once on the
 * landing that follows.
 *
 * sessionStorage, not localStorage: the marker belongs to one tab and one
 * arrival. One that outlives the tab that wrote it is a redirect nobody asked
 * for, days later.
 */
const PENDING_KEY = "easywed.venue.landing"

// Same treatment as the terms marker: unavailable or throwing storage (SSR,
// privacy mode, blocked cookies) degrades to a no-op, and the worst case is a
// staff member landing on the wedding list they can already navigate out of.
const safeSessionStorage = (): Storage | null => {
  if (typeof sessionStorage === "undefined") return null
  try {
    // Touching the object is itself what throws in a blocked-storage browser,
    // so the probe has to be inside the try.
    sessionStorage.getItem(PENDING_KEY)
    return sessionStorage
  } catch {
    return null
  }
}

/** Ask the next landing to work out whether this account belongs in a CRM. */
export const armVenueLanding = (): void => {
  try {
    safeSessionStorage()?.setItem(PENDING_KEY, "1")
  } catch {
    // see safeSessionStorage
  }
}

export const isVenueLandingPending = (): boolean =>
  safeSessionStorage()?.getItem(PENDING_KEY) === "1"

/**
 * Spends the marker.
 *
 * Called once the lookup has answered - either way. A marker that survives a
 * "no" would re-ask on the next arrival for as long as the tab lives, and the
 * answer cannot change without a sign-out.
 */
export const clearVenueLanding = (): void => {
  try {
    safeSessionStorage()?.removeItem(PENDING_KEY)
  } catch {
    // see safeSessionStorage
  }
}
