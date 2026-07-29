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

  // The local (llama.cpp) provider talks to http://localhost, which only works
  // when the dev server runs on the same machine - hide it entirely in
  // production builds (rather than showing a dead toggle) until we ship a
  // proper local-bridge story. With one provider left there is nothing to
  // choose, so the toggle itself disappears too.
  const providers: Array<AiProvider> = import.meta.env.DEV
    ? ["openrouter", "local"]
    : ["openrouter"]

  // Which setup flow the settings form shows. Defaults to whatever the saved
  // settings look like (so it tracks the async-hydrated store), but a user
  // toggle pins an explicit choice. In production a saved localhost URL still
  // detects as "local", so clamp to an offered provider. AiChatSettings is
  // keyed by this below so a switch remounts it with the right defaults.
  const [modeOverride, setModeOverride] = useState<AiProvider | null>(null)
  const detected = modeOverride ?? detectProvider(baseUrl)
  const mode = providers.includes(detected) ? detected : "openrouter"

  // Leaving the panel (view change / close) aborts any in-flight turn so it
  // can't keep mutating the planner in the background. Toggling settings does
  // not unmount this component, so it won't interrupt a running stream.
  useEffect(() => () => useAiChatStore.getState().abort(), [])

  // The toolbar carries its own bottom border, so an empty one (first-run
  // setup: no provider toggle, no transcript to clear, no gear until a key is
  // saved) reads as a stray second separator right under the panel header.
  // Drop the row entirely unless something lives in it.
  const showProviderToggle = showSettings && providers.length > 1
  const showClear = hasMessages && !showSettings
  const showToolbar = showProviderToggle || showClear || isConfigured

  return (
    <div className="flex h-full flex-col">
      {showToolbar && (
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          {showProviderToggle && (
            <ButtonGroup>
              {providers.map((option) => (
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
            {showClear && (
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
      )}

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
