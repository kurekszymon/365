import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { CustomerAcceptFailure, InviteWedding } from "@/lib/sync/tenant"
import {
  acceptCustomerInvitation,
  fetchInviteWeddings,
  fetchMyVenueMembership,
} from "@/lib/sync/tenant"
import { createWedding } from "@/lib/sync/createWedding"
import { track } from "@/lib/analytics/track"

/** The picker's "make a new plan" choice, alongside real wedding ids. */
export const NEW_WEDDING = "new"

/**
 * What the accept step can fail with: the RPC's reasons, minus the one that
 * is a question (`switch_required`), plus the create that can fail first.
 */
export type CustomerAcceptError =
  | Exclude<CustomerAcceptFailure, "switch_required">
  | "create_failed"

/**
 * Everything the customer half of the invitation page does, and every call it
 * makes. The components beside it only render.
 *
 * The flow is one call - `accept_customer_invitation` joins and links together
 * (20260820000001 §4c) - with two detours:
 *
 *   - **"new wedding"** creates the plan first. The id is remembered, so a
 *     retry after a refusal (most often the switch question) reuses the plan
 *     instead of leaving a trail of empty weddings behind.
 *   - **PT412** means the account is a customer of another venue. That is a
 *     question, not an error: the page names the venue being left and, on
 *     confirmation, retries with `leaveCurrent`. The name is a separate read
 *     because the RPC does not return it; if that read fails the question is
 *     asked without the name rather than not at all.
 *
 * On success it navigates to the planner with `?venue=review`, which opens the
 * venue dialog on the status step - the wedding is `pending`, and granting the
 * venue access is a separate, explicit act the couple still has to make.
 */
export function useCustomerInviteAccept({
  token,
  userId,
  venueSlug,
}: {
  token: string
  userId: string
  venueSlug: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [weddings, setWeddings] = useState<Array<InviteWedding> | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // `null` until the user picks: the default is derived from the list below,
  // so a list that arrives late does not fight a choice already made.
  const [picked, setPicked] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<CustomerAcceptError | null>(null)
  // Set when the RPC asked the switch question; `name` is null if the lookup
  // of the current venue failed.
  const [switchFrom, setSwitchFrom] = useState<{ name: string | null } | null>(
    null
  )

  const createdId = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    // An external read resolving into state - the setState calls are a sync
    // from the server, not a cascading render.
    void fetchInviteWeddings(userId, controller.signal).then((list) => {
      if (controller.signal.aborted) return
      if (!list) {
        setLoadFailed(true)
        return
      }
      setWeddings(list)
    })

    return () => controller.abort()
  }, [userId, reloadKey])

  const owned = weddings?.filter((w) => w.isOwner) ?? []
  const hasShared = weddings?.some((w) => !w.isOwner) ?? false

  // The first owned plan if there is one, otherwise a new one. Not "the first
  // one not yet linked here": re-accepting for a plan already linked to this
  // venue is harmless, and guessing past the top of the list is not.
  const selection = picked ?? owned.at(0)?.id ?? NEW_WEDDING

  // Plain functions, no useCallback: the React Compiler memoizes these, and
  // manual memoization over `weddings` is what it refuses to preserve.
  const retryLoad = () => {
    setLoadFailed(false)
    setWeddings(null)
    setReloadKey((k) => k + 1)
  }

  const pick = (id: string) => {
    setPicked(id)
    setError(null)
  }

  const submit = async (leaveCurrent = false) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const isNew = selection === NEW_WEDDING
    let weddingId = isNew ? createdId.current : selection

    if (!weddingId) {
      // Named the way the wedding list names its own, so a couple who
      // already has plans can tell this one apart.
      const visible = weddings?.length ?? 0
      weddingId = await createWedding(
        userId,
        visible === 0 ? t("wedding") : `${t("wedding")} ${visible}`
      )
      if (!weddingId) {
        setSubmitting(false)
        setError("create_failed")
        return
      }
      createdId.current = weddingId
      track("wedding_created", { source: "venue_invite" })
    }

    const result = await acceptCustomerInvitation(
      token,
      weddingId,
      leaveCurrent
    )

    if (!result.ok) {
      if (result.reason === "switch_required") {
        const current = await fetchMyVenueMembership(userId)
        setSwitchFrom({
          name: current.ok ? (current.membership?.name ?? null) : null,
        })
        setSubmitting(false)
        return
      }
      setSubmitting(false)
      setSwitchFrom(null)
      setError(result.reason)
      return
    }

    track("tenant_invite_claimed", { role: "customer" })
    track("tenant_invite_accepted", {
      wedding: isNew ? "new" : "existing",
      switched_venue: leaveCurrent,
    })
    // "venue": the link this accept spends is one the venue issued.
    track("venue_access_requested", { source: "venue" })

    // Left `submitting` on purpose: the page is about to be replaced, and a
    // button that re-enables for a frame invites a second accept.
    void navigate({
      to: "/wedding/$id/planner",
      params: { id: weddingId },
      search: { venue: "review" },
    })
  }

  const selected = owned.find((w) => w.id === selection) ?? null

  return {
    loading: weddings === null && !loadFailed,
    loadFailed,
    retryLoad,
    owned,
    hasShared,
    selection,
    pick,
    /**
     * What linking the selected plan would replace: its current venue, when
     * that is a *different* venue. Same venue is not a replacement - the RPC's
     * no-op keeps a live grant and the chosen menu.
     */
    replacing:
      selected?.venue && selected.venue.slug !== venueSlug
        ? selected.venue
        : null,
    submitting,
    error,
    switchFrom,
    cancelSwitch: () => setSwitchFrom(null),
    submit,
  }
}
