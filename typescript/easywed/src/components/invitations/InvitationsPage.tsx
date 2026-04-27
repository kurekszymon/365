import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { MailIcon } from "lucide-react"
import { DesignEditor } from "./DesignEditor"
import { InvitationPreview } from "./InvitationPreview"
import { Header } from "@/components/planner/Header"
import { DialogManager } from "@/components/dialogs/DialogManager"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { useInvitationStore } from "@/stores/invitation.store"
import { usePlannerStore } from "@/stores/planner.store"
import { decodeDesign, encodeDesign } from "@/lib/invitation/hash"
import { sanitizeGuestNames } from "@/lib/invitation/guestNames"
import "@/lib/invitation/fonts"

export function InvitationsPage({ weddingId }: { weddingId?: string }) {
  const { t } = useTranslation()
  const openDialog = useDialogStore((s) => s.open)
  const setDesign = useInvitationStore((s) => s.setDesign)
  const updateDesign = useInvitationStore((s) => s.updateDesign)
  const guests = usePlannerStore((s) => s.guests)
  const isFirstMount = useRef(true)

  // Capture mount-time values so the effect stays stable
  const mountRef = useRef({ weddingId, guests })

  // On mount: hydrate from URL hash, or seed guest names from planner store
  useEffect(() => {
    const { weddingId: wId, guests: g } = mountRef.current
    const hash = window.location.hash.slice(1)
    if (hash) {
      const decoded = decodeDesign(hash)
      if (decoded) {
        setDesign(decoded)
        isFirstMount.current = false
        return
      }
    }
    if (wId && g.length > 0) {
      updateDesign({ guestNames: sanitizeGuestNames(g.map((gu) => gu.name)) })
    }
    isFirstMount.current = false
  }, [setDesign, updateDesign])

  // Sync design → URL hash (debounced) without subscribing the page component
  // to every design change, which would rerender both editor and preview.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = useInvitationStore.subscribe((state, prevState) => {
      if (isFirstMount.current || state.design === prevState.design) return

      if (timeoutId) clearTimeout(timeoutId)

      timeoutId = setTimeout(() => {
        const hash = encodeDesign(state.design)
        history.replaceState(null, "", `#${hash}`)
      }, 500)
    })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [])

  return (
    <>
      {/* Override global @page (A4 landscape) for invitation printing */}
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          .invitation-card { page-break-after: always; }
        }
      `}</style>

      <DialogManager />
      <div className="flex h-screen flex-col">
        <Header>
          <Header.Title weddingId={weddingId}>
            <h1 className="text-base font-semibold">
              {t("invitations.page_title")}
            </h1>
          </Header.Title>
          <Button onClick={() => openDialog("Invitation.Order")}>
            <MailIcon />
            {t("invitations.order")}
          </Button>
        </Header>

        {/* Two-column layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden print:hidden">
          {/* Left: editor */}
          <div className="w-[420px] shrink-0 overflow-y-auto border-r px-5 py-5">
            <DesignEditor />
          </div>

          {/* Right: preview */}
          <div className="flex flex-1 items-start justify-center overflow-y-auto p-8">
            <InvitationPreview />
          </div>
        </div>
      </div>
    </>
  )
}
