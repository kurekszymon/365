import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ExternalLinkIcon } from "lucide-react"
import type { AiProvider } from "@/stores/ai.store"
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  LLAMACPP_API_KEY,
  LLAMACPP_BASE_URL,
  LLAMACPP_MODEL,
  detectProvider,
  isInsecureRemote,
  useAiStore,
} from "@/stores/ai.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

// Initial draft values for the chosen provider. Local always uses the llama.cpp
// placeholders (the server ignores key/model anyway); OpenRouter reuses the
// saved settings when they're already a hosted endpoint, else falls back to the
// hosted defaults. Mounted with `key={mode}` by the parent, so switching the
// header toggle remounts this component and re-runs these initializers.
const initialDrafts = (
  mode: AiProvider,
  saved: { baseUrl: string; apiKey: string; model: string }
) => {
  if (mode === "local")
    return {
      baseUrl: LLAMACPP_BASE_URL,
      apiKey: LLAMACPP_API_KEY,
      model: LLAMACPP_MODEL,
    }
  return detectProvider(saved.baseUrl) === "openrouter"
    ? saved
    : { baseUrl: DEFAULT_BASE_URL, apiKey: "", model: DEFAULT_MODEL }
}

export const AiChatSettings = ({
  mode,
  onSaved,
}: {
  mode: AiProvider
  onSaved?: () => void
}) => {
  const { t } = useTranslation()
  const { baseUrl, apiKey, model, setSettings } = useAiStore(
    useShallow((state) => ({
      baseUrl: state.baseUrl,
      apiKey: state.apiKey,
      model: state.model,
      setSettings: state.setSettings,
    }))
  )

  const initial = initialDrafts(mode, { baseUrl, apiKey, model })
  const [draftBaseUrl, setDraftBaseUrl] = useState(initial.baseUrl)
  const [draftApiKey, setDraftApiKey] = useState(initial.apiKey)
  const [draftModel, setDraftModel] = useState(initial.model)

  const canSave =
    draftBaseUrl.trim().length > 0 &&
    draftApiKey.trim().length > 0 &&
    draftModel.trim().length > 0

  const save = () => {
    if (!canSave) return
    setSettings({
      baseUrl: draftBaseUrl.trim(),
      apiKey: draftApiKey.trim(),
      model: draftModel.trim(),
    })
    onSaved?.()
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-sm font-semibold">
          {t("assistant.setup.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === "local"
            ? t("assistant.setup.llamacpp_intro")
            : t("assistant.setup.intro")}
        </p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ai-base-url">
            {t("assistant.base_url")}
          </FieldLabel>
          <Input
            id="ai-base-url"
            value={draftBaseUrl}
            onChange={(e) => setDraftBaseUrl(e.target.value)}
            placeholder={DEFAULT_BASE_URL}
            autoComplete="off"
            spellCheck={false}
          />
          <FieldDescription>{t("assistant.base_url_hint")}</FieldDescription>
          {isInsecureRemote(draftBaseUrl) && (
            <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-500">
              {t("assistant.setup.insecure_url")}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="ai-api-key">{t("assistant.api_key")}</FieldLabel>
          <Input
            id="ai-api-key"
            type="password"
            value={draftApiKey}
            onChange={(e) => setDraftApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
          />
          <FieldDescription>{t("assistant.api_key_hint")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="ai-model">{t("assistant.model")}</FieldLabel>
          <Input
            id="ai-model"
            value={draftModel}
            onChange={(e) => setDraftModel(e.target.value)}
            placeholder={DEFAULT_MODEL}
            autoComplete="off"
            spellCheck={false}
          />
          <FieldDescription>{t("assistant.model_hint")}</FieldDescription>
        </Field>
      </FieldGroup>

      <Button onClick={save} disabled={!canSave}>
        {t("assistant.setup.save")}
      </Button>

      {mode === "local" ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{t("assistant.setup.llamacpp_title")}</p>
          <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
            <li>{t("assistant.setup.llamacpp_step_1")}</li>
            <li>{t("assistant.setup.llamacpp_step_2")}</li>
            <li>{t("assistant.setup.llamacpp_step_3")}</li>
          </ol>
          <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-muted-foreground">
            {t("assistant.setup.llamacpp_jinja")}
          </p>
          <a
            href="https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
          >
            {t("assistant.setup.llamacpp_models")}
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{t("assistant.setup.how_title")}</p>
          <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
            <li>{t("assistant.setup.step_1")}</li>
            <li>{t("assistant.setup.step_2")}</li>
            <li>{t("assistant.setup.step_3")}</li>
          </ol>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
          >
            {t("assistant.setup.get_key")}
            <ExternalLinkIcon className="size-3.5" />
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("assistant.setup.security_note")}
          </p>
        </div>
      )}
    </div>
  )
}
