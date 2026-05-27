import type { ProgressState } from "./types"

export function exportProgress(state: ProgressState): string {
  return JSON.stringify(state, null, 2)
}

export function importProgress(json: string): ProgressState | null {
  try {
    const parsed = JSON.parse(json)
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.cards === "object" &&
      typeof parsed.levels === "object"
    ) {
      return parsed as ProgressState
    }
    return null
  } catch {
    return null
  }
}
