import { useEffect, useState } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, TrashIcon } from "lucide-react"
import type { HallPreset } from "@/stores/planner.store"
import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/venue/templates")({
  beforeLoad: () => {
    requireAuth("/venue/templates")
    requireOnboarded()

    const { isReady } = useAuthStore.getState()
    if (!isReady) return
    const { userType } = useGlobalStore.getState()
    if (userType !== "venue") {
      throw redirect({ to: "/", replace: true })
    }
  },
  component: VenueTemplates,
})

type TemplateRow = {
  id: string
  name: string
  description: string | null
  hall_preset: string
  width: number
  height: number
  is_public: boolean
  created_at: string
  table_count: number
  fixture_count: number
}

type CreateForm = {
  name: string
  description: string
  hall_preset: HallPreset
  width: string
  height: string
  is_public: boolean
}

const DEFAULT_FORM: CreateForm = {
  name: "",
  description: "",
  hall_preset: "rectangle",
  width: "20",
  height: "12",
  is_public: true,
}

function VenueTemplates() {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const [templates, setTemplates] = useState<Array<TemplateRow>>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    void fetchTemplates(session.user.id, setTemplates, setLoading)
  }, [session])

  const handleCreate = async () => {
    if (!session || submitting) return
    const width = parseFloat(form.width)
    const height = parseFloat(form.height)
    if (
      !form.name.trim() ||
      isNaN(width) ||
      isNaN(height) ||
      width <= 0 ||
      height <= 0
    ) {
      setError("Please fill in all required fields with valid values.")
      return
    }

    setSubmitting(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from("hall_templates")
      .insert({
        creator_id: session.user.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        hall_preset: form.hall_preset,
        width,
        height,
        is_public: form.is_public,
      })
      .select(
        "id, name, description, hall_preset, width, height, is_public, created_at"
      )
      .single()

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setTemplates((prev) => [
      {
        ...data,
        width: Number(data.width),
        height: Number(data.height),
        table_count: 0,
        fixture_count: 0,
      },
      ...prev,
    ])
    setCreateOpen(false)
    setForm(DEFAULT_FORM)
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const prev = templates
    setTemplates((list) => list.filter((tmpl) => tmpl.id !== id))
    const { error: deleteError } = await supabase
      .from("hall_templates")
      .delete()
      .eq("id", id)
    if (deleteError) {
      console.error("[venue/templates] delete", deleteError)
      setTemplates(prev)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("venue.templates.title")}</h1>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            {t("venue.templates.create")}
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("venue.templates.loading")}
          </p>
        ) : templates.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("venue.templates.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-medium">{tmpl.name}</span>
                  {tmpl.description && (
                    <span className="text-sm text-muted-foreground">
                      {tmpl.description}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {t(`hall.preset.${tmpl.hall_preset}`)} &middot;{" "}
                    {t("templates.dimensions", {
                      width: tmpl.width,
                      height: tmpl.height,
                    })}{" "}
                    &middot;{" "}
                    {t("venue.templates.tables_count", {
                      count: tmpl.table_count,
                    })}{" "}
                    &middot;{" "}
                    {tmpl.is_public
                      ? t("venue.templates.public")
                      : t("venue.templates.private")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(tmpl.id)}
                  aria-label={t("venue.templates.delete")}
                >
                  <TrashIcon />
                </Button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mx-auto text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("auth.sign_out")}
        </button>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(next) => {
          if (!next) {
            setCreateOpen(false)
            setForm(DEFAULT_FORM)
            setError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("venue.templates.create_title")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="tmpl-name">{t("common.name")}</FieldLabel>
              <Input
                id="tmpl-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("venue.templates.name_placeholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tmpl-desc">
                {t("venue.templates.description")}
              </FieldLabel>
              <Input
                id="tmpl-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={t("venue.templates.description_placeholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tmpl-preset">{t("hall.shape")}</FieldLabel>
              <Select
                value={form.hall_preset}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, hall_preset: v as HallPreset }))
                }
              >
                <SelectTrigger id="tmpl-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangle">
                    {t("hall.preset.rectangle")}
                  </SelectItem>
                  <SelectItem value="l-shape">
                    {t("hall.preset.l-shape")}
                  </SelectItem>
                  <SelectItem value="u-shape">
                    {t("hall.preset.u-shape")}
                  </SelectItem>
                  <SelectItem value="custom">
                    {t("hall.preset.custom")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex gap-3">
              <Field className="flex-1">
                <FieldLabel htmlFor="tmpl-width">
                  {t("common.width")} (m)
                </FieldLabel>
                <Input
                  id="tmpl-width"
                  type="number"
                  min={1}
                  step={0.5}
                  value={form.width}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, width: e.target.value }))
                  }
                />
              </Field>
              <Field className="flex-1">
                <FieldLabel htmlFor="tmpl-height">
                  {t("common.height")} (m)
                </FieldLabel>
                <Input
                  id="tmpl-height"
                  type="number"
                  min={1}
                  step={0.5}
                  value={form.height}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, height: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="tmpl-visibility">
                {t("venue.templates.visibility")}
              </FieldLabel>
              <Select
                value={form.is_public ? "public" : "private"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, is_public: v === "public" }))
                }
              >
                <SelectTrigger id="tmpl-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    {t("venue.templates.public")}
                  </SelectItem>
                  <SelectItem value="private">
                    {t("venue.templates.private")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? t("onboarding.saving") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

async function fetchTemplates(
  userId: string,
  setTemplates: (rows: Array<TemplateRow>) => void,
  setLoading: (v: boolean) => void
) {
  setLoading(true)

  // Fetch templates together with their child-row counts in three parallel
  // requests (1 template list + 1 table counts + 1 fixture counts) instead
  // of 1 + 2*N individual round-trips.
  const { data, error } = await supabase
    .from("hall_templates")
    .select(
      "id, name, description, hall_preset, width, height, is_public, created_at"
    )
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[venue/templates] fetch", error)
    setLoading(false)
    return
  }

  if (data.length === 0) {
    setTemplates([])
    setLoading(false)
    return
  }

  const ids = data.map((t) => t.id)

  const [tablesRes, fixturesRes] = await Promise.all([
    supabase
      .from("hall_template_tables")
      .select("template_id")
      .in("template_id", ids),
    supabase
      .from("hall_template_fixtures")
      .select("template_id")
      .in("template_id", ids),
  ])

  const tableCounts = new Map<string, number>()
  const fixtureCounts = new Map<string, number>()
  for (const row of tablesRes.data ?? []) {
    tableCounts.set(
      row.template_id,
      (tableCounts.get(row.template_id) ?? 0) + 1
    )
  }
  for (const row of fixturesRes.data ?? []) {
    fixtureCounts.set(
      row.template_id,
      (fixtureCounts.get(row.template_id) ?? 0) + 1
    )
  }

  setTemplates(
    data.map((tmpl) => ({
      ...tmpl,
      width: Number(tmpl.width),
      height: Number(tmpl.height),
      table_count: tableCounts.get(tmpl.id) ?? 0,
      fixture_count: fixtureCounts.get(tmpl.id) ?? 0,
    }))
  )
  setLoading(false)
}
