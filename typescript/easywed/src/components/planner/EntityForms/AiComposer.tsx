import { useState } from "react"
import { useTranslation } from "react-i18next"
import { SendHorizontalIcon } from "lucide-react"
import { useAiChatStore } from "@/stores/aiChat.store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { track } from "@/lib/analytics/track"

// Canned prompts shown above the input, matching the mockup's suggestion-chip
// row. Tapping one sends it immediately through the existing `send` action -
// no new logic, just a shortcut for a common request.
const SUGGESTIONS = [
  "assistant.suggestion.balance_tables",
  "assistant.suggestion.seat_unassigned",
] as const

export const AiComposer = () => {
  const { t } = useTranslation()
  const [text, setText] = useState("")
  const send = useAiChatStore((state) => state.send)
  const status = useAiChatStore((state) => state.status)

  const isStreaming = status === "streaming"
  const canSend = text.trim().length > 0 && !isStreaming

  // Both paths report only which affordance was used. The prompt itself is
  // never a property - a user asking the assistant to "seat Anna next to her
  // mum" is naming a guest just as surely as autocapture used to.
  const submit = () => {
    if (!canSend) return
    void send(text)
    track("ai_chat_message_sent", { source: "composer" })
    setText("")
  }

  const submitSuggestion = (key: (typeof SUGGESTIONS)[number]) => {
    if (isStreaming) return
    void send(t(key))
    track("ai_chat_message_sent", { source: "suggestion" })
  }

  return (
    <div className="flex flex-col gap-2.5 border-t bg-background px-4 py-3">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {SUGGESTIONS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={isStreaming}
            onClick={() => submitSuggestion(key)}
            className="shrink-0 rounded-full bg-muted px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50"
          >
            {t(key)}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t("assistant.placeholder")}
          rows={1}
          disabled={isStreaming}
          className="max-h-40 min-h-9 resize-none"
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={!canSend}
          aria-label={t("assistant.send")}
        >
          <SendHorizontalIcon />
        </Button>
      </div>
    </div>
  )
}
