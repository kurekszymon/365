import { useState } from "react"
import { useTranslation } from "react-i18next"
import { SendHorizontalIcon } from "lucide-react"
import { useAiChatStore } from "@/stores/aiChat.store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export const AiComposer = () => {
  const { t } = useTranslation()
  const [text, setText] = useState("")
  const send = useAiChatStore((state) => state.send)
  const status = useAiChatStore((state) => state.status)

  const isStreaming = status === "streaming"
  const canSend = text.trim().length > 0 && !isStreaming

  const submit = () => {
    if (!canSend) return
    void send(text)
    setText("")
  }

  return (
    <div className="flex items-end gap-2 border-t bg-background px-4 py-3">
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
  )
}
