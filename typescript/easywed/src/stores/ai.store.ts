import { create } from "zustand"
import { persist } from "zustand/middleware"

// Bring-your-own-key LLM settings. The customer supplies their own
// OpenAI-compatible endpoint + key + model id, so the same code path works with
// OpenRouter (recommended default), OpenAI, Azure, a local Ollama, etc.
//
// Stored in localStorage via `persist` (matching the `easywed.*` convention in
// theme.store.ts). `skipHydration` defers the read until RootDocument triggers
// it after mount, keeping the first client render equal to the server's default
// and avoiding an SSR hydration mismatch.
//
// Security note: the key is plaintext in localStorage and readable by any script
// running on the page (XSS). This matches the BYO-key model and is surfaced to
// the user in the setup instructions.

export const AI_STORAGE_KEY = "easywed.ai"

export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6"

// Quick-fill values for a local Ollama server. Ollama exposes an
// OpenAI-compatible API at /v1 and ignores the key, but the key field must be
// non-empty for the settings to count as configured, so we send a placeholder.
// The model must be one that supports tool calling (e.g. llama3.1, qwen2.5).
export const OLLAMA_BASE_URL = "http://localhost:11434/v1"
export const OLLAMA_API_KEY = "ollama"
export const OLLAMA_MODEL = "llama3.1"

export interface AiSettings {
  baseUrl: string
  apiKey: string
  model: string
}

type State = AiSettings

type Action = {
  setSettings: (settings: Partial<AiSettings>) => void
  clear: () => void
}

export const useAiStore = create<State & Action>()(
  persist(
    (set) => ({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: "",
      model: DEFAULT_MODEL,
      setSettings: (settings) => set(settings),
      clear: () =>
        set({ baseUrl: DEFAULT_BASE_URL, apiKey: "", model: DEFAULT_MODEL }),
    }),
    {
      name: AI_STORAGE_KEY,
      skipHydration: true,
    }
  )
)

export const selectIsConfigured = (state: State): boolean =>
  state.apiKey.trim().length > 0 &&
  state.baseUrl.trim().length > 0 &&
  state.model.trim().length > 0
