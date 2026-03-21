import type { PlannerState } from "./types"

const STORAGE_KEY = "easywed_planner"

export function saveToLocalStorage(state: PlannerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage quota exceeded — fail silently
  }
}

export function loadFromLocalStorage(): PlannerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlannerState
  } catch {
    return null
  }
}

export function exportAsJSON(state: PlannerState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${state.weddingName.replace(/\s+/g, "_")}_seating.easywed.json`
  // TODO: modify file?
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importFromJSON(file: File): Promise<PlannerState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (parsed.version !== 1 || !Array.isArray(parsed.tables)) {
          reject(new Error("Invalid EasyWed file format"))
          return
        }
        resolve(parsed as PlannerState)
      } catch {
        reject(new Error("Could not parse file"))
      }
    }
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsText(file)
  })
}
