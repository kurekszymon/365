import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "blush" | "sage" | "editorial"

export const THEMES: Array<Theme> = ["blush", "sage", "editorial"]

export const DEFAULT_THEME: Theme = "blush"

export const THEME_STORAGE_KEY = "easywed.theme"

type State = {
  theme: Theme
}

type Action = {
  setTheme: (theme: Theme) => void
}

// React owns the <html data-theme> attribute (bound in RootDocument), so the
// store only holds state — no imperative DOM writes. `skipHydration` defers the
// localStorage read until RootDocument triggers it after mount, keeping the
// first client render equal to the server's default and avoiding a hydration
// mismatch on <html>.
export const useThemeStore = create<State & Action>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      skipHydration: true,
    }
  )
)
