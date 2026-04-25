import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeftIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { DesignEditor } from "./DesignEditor"
import { InvitationPreview } from "./InvitationPreview"
import { OrderDialog } from "./OrderDialog"
import { useInvitationStore } from "@/stores/invitation.store"
import { useAuthStore } from "@/stores/auth.store"
import { usePlannerStore } from "@/stores/planner.store"
import { decodeDesign, encodeDesign } from "@/lib/invitation/hash"
import "@/lib/invitation/fonts"

export function InvitationsPage() {
  const { t } = useTranslation()
  const setDesign = useInvitationStore((s) => s.setDesign)
  const design = useInvitationStore((s) => s.design)
  const session = useAuthStore((s) => s.session)
  const guests = usePlannerStore((s) => s.guests)
  const isFirstMount = useRef(true)

  // On mount: hydrate from URL hash if present
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const decoded = decodeDesign(hash)
      if (decoded) setDesign(decoded)
    }
    isFirstMount.current = false
  }, [setDesign])

  // Sync design → URL hash (debounced)
  useEffect(() => {
    if (isFirstMount.current) return
    const id = setTimeout(() => {
      const hash = encodeDesign(design)
      history.replaceState(null, "", `#${hash}`)
    }, 500)
    return () => clearTimeout(id)
  }, [design])

  const guestNames = session ? guests.map((g) => g.name) : undefined
  const guestCount = session && guests.length > 0 ? guests.length : undefined

  return (
    <>
      {/* Override global @page (A4 landscape) for invitation printing */}
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          .invitation-card { page-break-after: always; }
        }
      `}</style>

      <div className="flex h-screen flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-background px-4 py-3 print:hidden">
          <div className="flex items-center gap-3">
            {session && (
              <Link
                to="/"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                {t("invitations.back")}
              </Link>
            )}
            <h1 className="text-base font-semibold">
              {t("invitations.page_title")}
            </h1>
          </div>
          <OrderDialog />
        </div>

        {/* Two-column layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden print:hidden">
          {/* Left: editor */}
          <div className="w-[420px] shrink-0 overflow-y-auto border-r px-5 py-5">
            <DesignEditor guestCount={guestCount} />
          </div>

          {/* Right: preview */}
          <div className="flex flex-1 items-start justify-center overflow-y-auto p-8">
            <InvitationPreview guests={guestNames} />
          </div>
        </div>
      </div>
    </>
  )
}
