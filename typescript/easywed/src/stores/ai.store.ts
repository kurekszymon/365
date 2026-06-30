import { create } from "zustand"
import { persist } from "zustand/middleware"

// Bring-your-own-key LLM settings. The customer supplies their own
// OpenAI-compatible endpoint + key + model id, so the same code path works with
// OpenRouter (recommended default), OpenAI, Azure, a local llama.cpp server, etc.
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
export const DEFAULT_MODEL = "qwen/qwen3.5-flash-02-23"

// Quick-fill values for a local llama.cpp server (`llama-server`). It exposes an
// OpenAI-compatible API at /v1 (default port 8080) and ignores both the key and
// the model id (it serves whatever model was loaded), but the key field must be
// non-empty for the settings to count as configured, so we send a placeholder.
// Tool calling requires the server to be started with `--jinja` and a model
// whose chat template supports tools.
export const LLAMACPP_BASE_URL = "http://localhost:8080/v1"
export const LLAMACPP_API_KEY = "no-key"
export const LLAMACPP_MODEL = "qwen/qwen3.5-flash-02-2"

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

// True when the URL would send the API key over plain (unencrypted) http to a
// non-local host. Localhost http is fine (that's how llama.cpp / Ollama run);
// a remote http endpoint leaks the key on the wire, so we warn about it.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export const isInsecureRemote = (url: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return false
  }
  return parsed.protocol === "http:" && !LOCAL_HOSTS.has(parsed.hostname)
}

// The two setup flows the settings UI offers: a hosted OpenAI-compatible
// endpoint (OpenRouter by default) vs. a local llama.cpp server.
export type AiProvider = "openrouter" | "local"

// Classify a base URL into a provider so the settings UI can default its
// toggle to match whatever is currently saved. A local host => the llama.cpp
// flow; anything else (including an unparseable/empty URL) => OpenRouter.
export const detectProvider = (url: string): AiProvider => {
  try {
    return LOCAL_HOSTS.has(new URL(url.trim()).hostname)
      ? "local"
      : "openrouter"
  } catch {
    return "openrouter"
  }
}
