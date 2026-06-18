import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "blush" | "sage" | "editorial"

export const THEMES: Array<Theme> = ["blush", "sage", "editorial"]

export const DEFAULT_THEME: Theme = "blush"

export const THEME_STORAGE_KEY = "easywed.theme"

/** Reflect the active theme onto <html data-theme> so the CSS palette applies. */
const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") return
  document.documentElement.dataset.theme = theme
}

type State = {
  theme: Theme
}

type Action = {
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<State & Action>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      // Apply the restored theme once persist rehydrates from localStorage. The
      // server renders the default palette; this swaps to the saved one on load.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
