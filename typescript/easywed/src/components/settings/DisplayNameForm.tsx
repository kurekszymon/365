import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { useGlobalStore } from "@/stores/global.store"
import { saveDisplayName } from "@/lib/sync/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MAX_LENGTH = 40

/**
 * Reads the Google name out of the session as a *prefill* only. Signing in
 * with Google hands us full_name whether we want it or not, but nothing is
 * stored until the user presses save - so what ends up visible to co-members
 * is always something they chose to share.
 */
const suggestedName = (
  metadata: Record<string, unknown> | undefined
): string => {
  const candidate = metadata?.full_name ?? metadata?.name
  return typeof candidate === "string" ? candidate : ""
}

export const DisplayNameForm = () => {
  const { t } = useTranslation()

  const session = useAuthStore((s) => s.session)
  const displayName = useProfileStore((s) => s.displayName)
  const isLoaded = useProfileStore((s) => s.isLoaded)
  const setDisplayName = useProfileStore((s) => s.setDisplayName)
  const setMemberDisplayName = useGlobalStore((s) => s.setMemberDisplayName)

  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!session || !isLoaded) return null

  // Uncontrolled until first edit: `value` is null while the field still shows
  // the stored name (or the Google suggestion for someone who has none).
  const current =
    value ?? displayName ?? suggestedName(session.user.user_metadata)
  const isDirty = current.trim() !== (displayName ?? "")

  const handleSave = async () => {
    setSaving(true)
    const { value: saved, error } = await saveDisplayName(
      session.user.id,
      current
    )
    setSaving(false)

    if (error) {
      toast.error(t("settings.display_name.failed"))
      return
    }

    setDisplayName(saved)
    // The header stack renders from the wedding's member list, not this store.
    setMemberDisplayName(session.user.id, saved)
    setValue(null)
    toast.success(t("settings.display_name.saved"))
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (isDirty && !saving) void handleSave()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display-name">{t("settings.display_name.label")}</Label>
        <Input
          id="display-name"
          value={current}
          maxLength={MAX_LENGTH}
          placeholder={t("settings.display_name.placeholder")}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t("settings.display_name.help")}
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!isDirty || saving}>
          {t("common.save")}
        </Button>
        {/* Clearing is a real choice, not an accident - going back to nameless
            means co-members see your role again, nothing more. */}
        {displayName && (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => setValue("")}
          >
            {t("settings.display_name.clear")}
          </Button>
        )}
      </div>
    </form>
  )
}
