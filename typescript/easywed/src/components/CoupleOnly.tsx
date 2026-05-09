import type { ReactNode } from "react"
import { useGlobalStore } from "@/stores/global.store"

export const CoupleOnly = ({ children }: { children: ReactNode }) => {
  const subjectKind = useGlobalStore((s) => s.subjectKind)
  if (subjectKind !== "wedding") return null
  return <>{children}</>
}
