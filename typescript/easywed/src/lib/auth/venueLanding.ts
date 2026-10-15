/**
 * The one-shot marker that lets the apex send a venue's staff to their CRM.
 *
 * On a tenant host the hostname names the venue, so `authLandingPath` answers
 * "/crm" with no round trip. The apex has to ask the database, and the answer
 * only matters at one moment.
 *
 * Hence a marker rather than a check on every render of /home: asking every
 * visit would cost every couple a query for an answer that is "no", and would
 * trap the venue owner who also plans a wedding of their own - every attempt to
 * reach their own list bouncing back to the CRM. Armed at the auth surface,
 * where "you just arrived from signing in" is known for free, spent once on the
 * landing that follows.
 *
 * sessionStorage, not localStorage: the marker belongs to one tab and one
 * arrival. One that outlives its tab is a redirect nobody asked for, days later.
 */
const PENDING_KEY = "easywed.venue.landing"

// Same treatment as the terms marker: unavailable or throwing storage degrades
// to a no-op, and the worst case is a staff member landing on the wedding list
// they can already navigate out of.
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
 * Spends the marker, when the landing *starts* looking rather than when the
 * lookup answers. Either answer spends it - one surviving a "no" would re-ask on
 * every arrival for the life of the tab - and so does no answer at all, since an
 * unmount mid-lookup leaves nobody to spend it. See useVenueStaffLanding.
 */
export const clearVenueLanding = (): void => {
  try {
    safeSessionStorage()?.removeItem(PENDING_KEY)
  } catch {
    // see safeSessionStorage
  }
}
