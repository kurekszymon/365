import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ExternalLinkIcon } from "lucide-react"
import { DEFAULT_BASE_URL, DEFAULT_MODEL, useAiStore } from "@/stores/ai.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

export const AiChatSettings = ({ onSaved }: { onSaved?: () => void }) => {
  const { t } = useTranslation()
  const { baseUrl, apiKey, model, setSettings } = useAiStore(
    useShallow((state) => ({
      baseUrl: state.baseUrl,
      apiKey: state.apiKey,
      model: state.model,
      setSettings: state.setSettings,
    }))
  )

  const [draftBaseUrl, setDraftBaseUrl] = useState(baseUrl)
  const [draftApiKey, setDraftApiKey] = useState(apiKey)
  const [draftModel, setDraftModel] = useState(model)

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
          {t("assistant.setup.intro")}
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
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
        >
          {t("assistant.setup.get_key")}
          <ExternalLinkIcon className="size-3.5" />
        </a>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("assistant.setup.security_note")}
        </p>
      </div>
    </div>
  )
}
