import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SourceLanguage, UILanguage } from "@/lib/types"

interface SettingsState {
  sourceLanguage: SourceLanguage
  uiLanguage: UILanguage
  setSourceLanguage: (lang: SourceLanguage) => void
  setUILanguage: (lang: UILanguage) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sourceLanguage: "pl",
      uiLanguage: "en",
      setSourceLanguage: (lang) => set({ sourceLanguage: lang }),
      setUILanguage: (lang) => set({ uiLanguage: lang }),
    }),
    { name: "lrn-settings" },
  ),
)
