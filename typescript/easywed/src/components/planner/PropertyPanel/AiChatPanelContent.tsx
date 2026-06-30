import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { SettingsIcon, Trash2Icon } from "lucide-react"
import { AiChatSettings } from "./AiChatSettings"
import { AiMessageList } from "./AiMessageList"
import { AiComposer } from "./AiComposer"
import type { AiProvider } from "@/stores/ai.store"
import { useAiChatStore } from "@/stores/aiChat.store"
import {
  detectProvider,
  selectIsConfigured,
  useAiStore,
} from "@/stores/ai.store"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export const AiChatPanelContent = () => {
  const { t } = useTranslation()
  const isConfigured = useAiStore(selectIsConfigured)
  const baseUrl = useAiStore((state) => state.baseUrl)
  const hasMessages = useAiChatStore((state) => state.messages.length > 0)
  const clear = useAiChatStore((state) => state.clear)

  // Until a key is configured the settings view is forced open; once configured
  // the gear toggles it. Deriving (rather than syncing via an effect) keeps the
  // "no key → settings" rule always true without a render cascade.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const showSettings = settingsOpen || !isConfigured

  // Which setup flow the settings form shows. Defaults to whatever the saved
  // settings look like (so it tracks the async-hydrated store), but a user
  // toggle pins an explicit choice. AiChatSettings is keyed by this below so a
  // switch remounts it with the right provider's defaults.
  const [modeOverride, setModeOverride] = useState<AiProvider | null>(null)
  const mode = modeOverride ?? detectProvider(baseUrl)

  // Leaving the panel (view change / close) aborts any in-flight turn so it
  // can't keep mutating the planner in the background. Toggling settings does
  // not unmount this component, so it won't interrupt a running stream.
  useEffect(() => () => useAiChatStore.getState().abort(), [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {showSettings && (
          <ButtonGroup>
            {(["openrouter", "local"] as Array<AiProvider>).map((option) => (
              <Button
                key={option}
                type="button"
                size="xs"
                variant={mode === option ? "default" : "outline"}
                onClick={() => setModeOverride(option)}
              >
                {t(`assistant.setup.provider_${option}`)}
              </Button>
            ))}
          </ButtonGroup>
        )}
        <div className="ml-auto flex items-center gap-1">
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
          {isConfigured && (
            <Button
              variant={showSettings ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label={t("assistant.settings")}
            >
              <SettingsIcon />
            </Button>
          )}
        </div>
      </div>

      {showSettings ? (
        // AiChatSettings only fires onSaved with valid (non-empty) settings, so
        // closing here always lands on a configured state. Keyed by `mode` so
        // toggling the provider remounts it with that provider's defaults.
        <AiChatSettings
          key={mode}
          mode={mode}
          onSaved={() => setSettingsOpen(false)}
        />
      ) : (
        <>
          <AiMessageList />
          <AiComposer />
        </>
      )}
    </div>
  )
}
