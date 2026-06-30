import { stepCountIs, streamText } from "ai"
import { createModel } from "./provider"
import { buildSystemPrompt } from "./systemPrompt"
import { tools } from "./tools"
import type { ModelMessage } from "ai"

export interface RunAgentCallbacks {
  onTextDelta: (delta: string) => void
  onToolCall: (call: { id: string; toolName: string; input: unknown }) => void
  onToolResult: (id: string, result: string) => void
  onToolError: (id: string, error: string) => void
}

// Runs one user turn: streams assistant text and drives the multi-step
// tool-calling loop (bounded by stepCountIs). Tool `execute` functions mutate
// the planner store directly; the destructive ones await user confirmation via
// the chat store. Returns the generated messages (assistant + tool) to append
// to the conversation history so the next turn has full context.
export const runAgent = async (params: {
  history: Array<ModelMessage>
  callbacks: RunAgentCallbacks
  abortSignal?: AbortSignal
}): Promise<Array<ModelMessage>> => {
  const result = streamText({
    model: createModel(),
    system: buildSystemPrompt(),
    messages: params.history,
    tools,
    stopWhen: stepCountIs(8),
    abortSignal: params.abortSignal,
  })

  for await (const part of result.fullStream) {
    switch (part.type) {
      case "text-delta":
        params.callbacks.onTextDelta(part.text)
        break
      case "tool-call":
        params.callbacks.onToolCall({
          id: part.toolCallId,
          toolName: part.toolName,
          input: part.input,
        })
        break
      case "tool-result":
        params.callbacks.onToolResult(part.toolCallId, String(part.output))
        break
      case "tool-error":
        params.callbacks.onToolError(part.toolCallId, String(part.error))
        break
      case "error":
        // Surfaced as a thrown error so the store can flip to its error state.
        throw part.error
    }
  }

  const response = await result.response
  return response.messages
}
