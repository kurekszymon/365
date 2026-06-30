import { create } from "zustand"
import { toast } from "sonner"
import type { ModelMessage } from "ai"
import { runAgent } from "@/lib/ai/runAgent"
import i18n from "@/i18n"

export type ChatStatus = "idle" | "streaming" | "error"

export type ToolChipStatus = "running" | "done" | "cancelled" | "error"

export interface ToolChip {
  id: string
  toolName: string
  input: unknown
  status: ToolChipStatus
  result?: string
}

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; tools: Array<ToolChip> }

export interface PendingConfirm {
  id: string
  toolName: string
  label: string
  resolve: (approved: boolean) => void
}

type State = {
  messages: Array<ChatMessage>
  // Canonical LLM history (assistant/tool messages carry full tool context
  // across turns); kept separate from the UI `messages` view.
  history: Array<ModelMessage>
  status: ChatStatus
  error: string | null
  // FIFO of destructive ops awaiting confirmation. A queue (not a single slot)
  // because the model can fire multiple delete tools in one step, which the SDK
  // executes concurrently — each gets its own pending entry, resolved in order.
  confirmQueue: Array<PendingConfirm>
}

type Action = {
  send: (text: string) => Promise<void>
  clear: () => void
  requestConfirm: (toolName: string, label: string) => Promise<boolean>
  resolveConfirm: (approved: boolean) => void
}

const uid = () => crypto.randomUUID()

// The confirm currently shown to the user is the head of the queue.
export const selectPendingConfirm = (state: State): PendingConfirm | null =>
  state.confirmQueue[0] ?? null

export const useAiChatStore = create<State & Action>((set, get) => {
  const patchAssistant = (
    id: string,
    patch: (message: Extract<ChatMessage, { role: "assistant" }>) => ChatMessage
  ) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id && m.role === "assistant" ? patch(m) : m
      ),
    }))

  const settleTool = (
    assistantId: string,
    toolCallId: string,
    status: ToolChipStatus,
    result: string
  ) =>
    patchAssistant(assistantId, (m) => ({
      ...m,
      tools: m.tools.map((chip) =>
        chip.id === toolCallId ? { ...chip, status, result } : chip
      ),
    }))

  return {
    messages: [],
    history: [],
    status: "idle",
    error: null,
    confirmQueue: [],

    send: async (text) => {
      const trimmed = text.trim()
      if (!trimmed || get().status === "streaming") return

      const assistantId = uid()
      const nextHistory: Array<ModelMessage> = [
        ...get().history,
        { role: "user", content: trimmed },
      ]

      set((state) => ({
        messages: [
          ...state.messages,
          { id: uid(), role: "user", text: trimmed },
          { id: assistantId, role: "assistant", text: "", tools: [] },
        ],
        history: nextHistory,
        status: "streaming",
        error: null,
      }))

      try {
        const responseMessages = await runAgent({
          history: nextHistory,
          callbacks: {
            onTextDelta: (delta) =>
              patchAssistant(assistantId, (m) => ({
                ...m,
                text: m.text + delta,
              })),
            onToolCall: ({ id, toolName, input }) =>
              patchAssistant(assistantId, (m) => ({
                ...m,
                tools: [...m.tools, { id, toolName, input, status: "running" }],
              })),
            onToolResult: (id, result) =>
              settleTool(
                assistantId,
                id,
                result.toLowerCase().includes("cancel") ? "cancelled" : "done",
                result
              ),
            onToolError: (id, error) =>
              settleTool(assistantId, id, "error", error),
          },
        })
        set((state) => ({
          history: [...state.history, ...responseMessages],
          status: "idle",
        }))
      } catch (error) {
        // Unblock every dangling confirmation so each awaited execute settles.
        for (const pending of get().confirmQueue) pending.resolve(false)
        set({ confirmQueue: [] })
        const message = error instanceof Error ? error.message : String(error)
        set({ status: "error", error: message })
        toast.error(i18n.t("assistant.error"), { description: message })
      }
    },

    clear: () => {
      for (const pending of get().confirmQueue) pending.resolve(false)
      set({
        messages: [],
        history: [],
        status: "idle",
        error: null,
        confirmQueue: [],
      })
    },

    requestConfirm: (toolName, label) =>
      new Promise<boolean>((resolve) => {
        set((state) => ({
          confirmQueue: [
            ...state.confirmQueue,
            { id: uid(), toolName, label, resolve },
          ],
        }))
      }),

    resolveConfirm: (approved) => {
      const queue = get().confirmQueue
      if (queue.length === 0) return
      const [head, ...rest] = queue
      head.resolve(approved)
      set({ confirmQueue: rest })
    },
  }
})
