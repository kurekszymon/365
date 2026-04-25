import LZString from "lz-string"
import type { InvitationDesign } from "@/stores/invitation.store"

export function encodeDesign(design: InvitationDesign): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(design))
}

export function decodeDesign(raw: string): InvitationDesign | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(
      raw.startsWith("#") ? raw.slice(1) : raw
    )
    return json ? (JSON.parse(json) as InvitationDesign) : null
  } catch {
    return null
  }
}
