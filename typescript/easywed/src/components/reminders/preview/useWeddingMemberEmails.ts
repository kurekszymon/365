import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"
import { isLocalWedding } from "@/lib/localWedding"

export interface MemberEmail {
  userId: string
  email: string
  role: string
}

// Fetches the emails of the current wedding's members (via the
// `wedding_member_emails` security-definer RPC) to power recipient hints on the
// reminder form. Skips the device-local guest wedding, which has no members.
export function useWeddingMemberEmails(): Array<MemberEmail> {
  const weddingId = useGlobalStore((state) => state.weddingId)
  const [members, setMembers] = useState<Array<MemberEmail>>([])

  useEffect(() => {
    if (!weddingId || isLocalWedding(weddingId)) {
      // Clear any hints carried over from a previous wedding.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMembers([])
      return
    }
    let active = true
    void supabase
      .rpc("wedding_member_emails", { _wedding_id: weddingId })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error("[reminders] failed to load member emails", error)
          return
        }
        // setState only after awaiting the fetch — an external-data sync.
        // `data` can be null even without an error; default to an empty list.
        setMembers(
          (data ?? []).map((m) => ({
            userId: m.user_id,
            email: m.email,
            role: m.role,
          }))
        )
      })
    return () => {
      active = false
    }
  }, [weddingId])

  return members
}
