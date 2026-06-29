import { useState } from "react"
import { useTranslation } from "react-i18next"
import { SettingsIcon, Trash2Icon } from "lucide-react"
import { AiChatSettings } from "./AiChatSettings"
import { AiMessageList } from "./AiMessageList"
import { AiComposer } from "./AiComposer"
import { useAiChatStore } from "@/stores/aiChat.store"
import { selectIsConfigured, useAiStore } from "@/stores/ai.store"
import { Button } from "@/components/ui/button"

export const AiChatPanelContent = () => {
  const { t } = useTranslation()
  const isConfigured = useAiStore(selectIsConfigured)
  const hasMessages = useAiChatStore((state) => state.messages.length > 0)
  const clear = useAiChatStore((state) => state.clear)

  // Until a key is configured the settings view is forced open; once configured
  // the gear toggles it. Deriving (rather than syncing via an effect) keeps the
  // "no key → settings" rule always true without a render cascade.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const showSettings = settingsOpen || !isConfigured

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b px-2 py-1.5">
        {hasMessages && !showSettings && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clear}
            aria-label={t("assistant.clear")}
          >
            <Trash2Icon />
          </Button>
        )}
        <Button
          variant={showSettings ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setSettingsOpen((open) => !open)}
          disabled={!isConfigured}
          aria-label={t("assistant.settings")}
        >
          <SettingsIcon />
        </Button>
      </div>

      {showSettings ? (
        // AiChatSettings only fires onSaved with valid (non-empty) settings, so
        // closing here always lands on a configured state.
        <AiChatSettings onSaved={() => setSettingsOpen(false)} />
      ) : (
        <>
          <AiMessageList />
          <AiComposer />
        </>
      )}
    </div>
  )
}
