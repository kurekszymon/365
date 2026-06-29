import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import { useAiStore } from "@/stores/ai.store"

// Builds a language model from the user's BYO-key settings. Read fresh on every
// call so a settings change takes effect on the next message without a reload.
//
// Calls run directly browser → user's endpoint (there is no server route).
// OpenAI / OpenRouter / Gemini allow this with the user's key; a native
// Anthropic base URL would be blocked by CORS — the setup instructions steer
// users to OpenRouter for Claude/Gemini.
export const createModel = (): LanguageModel => {
  const { baseUrl, apiKey, model } = useAiStore.getState()
  const provider = createOpenAICompatible({
    name: "easywed-byok",
    baseURL: baseUrl.trim(),
    apiKey: apiKey.trim(),
  })
  return provider.chatModel(model.trim())
}
