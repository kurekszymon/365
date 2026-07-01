import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { MigrateLocalWeddingDialog } from "@/components/dialogs/weddings"
import {
  hasLocalWeddingData,
  readLocalGlobalSnapshot,
  readLocalPlannerSnapshot,
} from "@/lib/localWedding"
import { useAuthStore } from "@/stores/auth.store"

const DISMISSED_KEY = "easywed.guest_migration_dismissed"

// Root-level (not route-scoped) so it fires regardless of where sign-in
// happens: /login, /auth/callback, or a second tab. Watches for a
// null -> non-null session transition and, if there's local wedding data
// worth keeping, offers to migrate it into a new cloud wedding.
export function LocalWeddingMigrationPrompt() {
  const session = useAuthStore((s) => s.session)
  const previousSession = useRef<Session | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    const justSignedIn = !previousSession.current && session
    previousSession.current = session

    if (
      justSignedIn &&
      !sessionStorage.getItem(DISMISSED_KEY) &&
      hasLocalWeddingData()
    ) {
      setPromptOpen(true)
    }
  }, [session])

  if (!promptOpen) return null

  const planner = readLocalPlannerSnapshot()
  const global = readLocalGlobalSnapshot()
  if (!planner) return null

  const close = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1")
    setPromptOpen(false)
  }

  return (
    <MigrateLocalWeddingDialog
      open={promptOpen}
      planner={planner}
      global={global ?? {}}
      onClose={close}
    />
  )
}
