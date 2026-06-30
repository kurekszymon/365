import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertCircleIcon,
  CheckIcon,
  Loader2Icon,
  SparklesIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react"
import type { ChatMessage, ToolChip } from "@/stores/aiChat.store"
import { selectPendingConfirm, useAiChatStore } from "@/stores/aiChat.store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const ToolChipRow = ({ chip }: { chip: ToolChip }) => {
  const { t } = useTranslation()
  const label = t(`assistant.tool.${chip.toolName}`, {
    defaultValue: chip.toolName,
  })
  return (
    <div className="flex items-start gap-2 rounded-md border bg-background px-2 py-1.5 text-xs">
      <span className="mt-0.5 text-muted-foreground">
        {chip.status === "running" && (
          <Loader2Icon className="size-3.5 animate-spin" />
        )}
        {chip.status === "done" && (
          <CheckIcon className="size-3.5 text-emerald-600" />
        )}
        {chip.status === "cancelled" && <XIcon className="size-3.5" />}
        {chip.status === "error" && (
          <AlertCircleIcon className="size-3.5 text-destructive" />
        )}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 font-medium">
          <WrenchIcon className="size-3" />
          {label}
        </span>
        {chip.result && (
          <span className="text-muted-foreground">{chip.result}</span>
        )}
      </span>
    </div>
  )
}

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const { t } = useTranslation()
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
        {message.text}
      </div>
    )
  }
  return (
    <div className="mr-auto flex max-w-[90%] flex-col gap-2">
      {message.text && (
        <div className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
          {message.text}
        </div>
      )}
      {message.tools.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {message.tools.map((chip) => (
            <ToolChipRow key={chip.id} chip={chip} />
          ))}
        </div>
      )}
      {!message.text && message.tools.length === 0 && (
        <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          {t("assistant.thinking")}
        </div>
      )}
    </div>
  )
}

const ConfirmRow = () => {
  const { t } = useTranslation()
  const pendingConfirm = useAiChatStore(selectPendingConfirm)
  const resolveConfirm = useAiChatStore((state) => state.resolveConfirm)
  if (!pendingConfirm) return null
  return (
    <div className="mr-auto flex w-full max-w-[90%] flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
      <p className="text-sm">
        {t("assistant.confirm_delete", { name: pendingConfirm.label })}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => resolveConfirm(true)}
        >
          {t("assistant.confirm")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => resolveConfirm(false)}
        >
          {t("assistant.cancel")}
        </Button>
      </div>
    </div>
  )
}

export const AiMessageList = () => {
  const { t } = useTranslation()
  const messages = useAiChatStore((state) => state.messages)
  const pendingConfirm = useAiChatStore(selectPendingConfirm)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, pendingConfirm])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
        <SparklesIcon className="size-6" />
        <p className="text-sm">{t("assistant.empty")}</p>
        <p className="text-xs">{t("assistant.empty_hint")}</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4")}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <ConfirmRow />
      <div ref={bottomRef} />
    </div>
  )
}
