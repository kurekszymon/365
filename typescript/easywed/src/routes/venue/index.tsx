import { useEffect, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronUp } from "lucide-react"

import type {
  Fixture,
  FixtureShape,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import { requireAuth, requireOnboarded } from "@/lib/auth/guards"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HallBackground } from "@/components/planner/Canvas/HallBackground"
import { TableVisual } from "@/components/planner/Canvas/TableVisual"
import { FixtureVisual } from "@/components/planner/Canvas/FixtureVisual"

export const Route = createFileRoute("/venue/")({
  beforeLoad: () => {
    requireAuth("/venue")
    requireOnboarded()
    // Couples have no business on the venue dashboard — its inserts would
    // hit RLS failures (venues INSERT policy gates on profile.user_type).
    // Bounce them to their own root, where index.tsx will route correctly.
    if (useGlobalStore.getState().userType === "couple") {
      throw redirect({ to: "/", replace: true })
    }
  },
  component: VenueDashboard,
})

type Venue = { id: string; name: string }
type Hall = {
  id: string
  name: string
  preset: string
  width: number
  height: number
  is_public: boolean
}
type HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"

function VenueDashboard() {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [halls, setHalls] = useState<Array<Hall>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    const ctrl = new AbortController()
    // Box the cancelled flag and read it through a helper so TS doesn't
    // narrow `state.cancelled` to `false` after the first read.
    const state = { cancelled: false }
    const isCancelled = () => state.cancelled

    void (async () => {
      const venueRes = await supabase
        .from("venues")
        .select("id, name")
        .eq("owner_id", session.user.id)
        .abortSignal(ctrl.signal)
        .maybeSingle()

      if (isCancelled()) return
      if (venueRes.error) {
        setError(venueRes.error.message)
        setLoading(false)
        return
      }
      setVenue(venueRes.data)

      if (venueRes.data) {
        const hallsRes = await supabase
          .from("venue_halls")
          .select("id, name, preset, width, height, is_public")
          .eq("venue_id", venueRes.data.id)
          .order("created_at", { ascending: false })
          .abortSignal(ctrl.signal)

        if (isCancelled()) return
        if (hallsRes.error) {
          setError(hallsRes.error.message)
        } else {
          setHalls(
            hallsRes.data.map((h) => ({
              id: h.id,
              name: h.name,
              preset: h.preset,
              width: Number(h.width),
              height: Number(h.height),
              is_public: h.is_public,
            }))
          )
        }
      }
      setLoading(false)
    })()

    return () => {
      state.cancelled = true
      ctrl.abort()
    }
  }, [session])

  if (loading) {
    return (
      <p className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {t("venue.dashboard.loading")}
      </p>
    )
  }

  if (!venue) {
    return (
      <CreateVenueForm
        onCreated={(v) => {
          setVenue(v)
        }}
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center p-6">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{venue.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t("venue.dashboard.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.sign_out")}
          </button>
        </div>

        <CreateHallForm
          venueId={venue.id}
          onCreated={(hall) => setHalls((prev) => [hall, ...prev])}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2">
          {halls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("venue.halls.empty")}
            </p>
          ) : (
            halls.map((hall) => (
              <HallRow
                key={hall.id}
                hall={hall}
                onUpdated={(updated) =>
                  setHalls((prev) =>
                    prev.map((h) => (h.id === updated.id ? updated : h))
                  )
                }
                onDeleted={(id) =>
                  setHalls((prev) => prev.filter((h) => h.id !== id))
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function CreateVenueForm({ onCreated }: { onCreated: (v: Venue) => void }) {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!session || !name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from("venues")
      .insert({ owner_id: session.user.id, name: name.trim() })
      .select("id, name")
      .single()
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated({ id: data.id, name: data.name })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">
          {t("venue.dashboard.create_title")}
        </h1>
        <Label htmlFor="venue-name">{t("onboarding.venue.name_label")}</Label>
        <Input
          id="venue-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Button onClick={handleCreate} disabled={!name.trim() || submitting}>
          {t("common.create")}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function CreateHallForm({
  venueId,
  onCreated,
}: {
  venueId: string
  onCreated: (hall: Hall) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [preset] = useState<HallPreset>("rectangle")
  const [width, setWidth] = useState(20)
  const [height, setHeight] = useState(12)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from("venue_halls")
      .insert({
        venue_id: venueId,
        name: name.trim(),
        preset,
        width,
        height,
        is_public: true,
      })
      .select("id, name, preset, width, height, is_public")
      .single()
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated({
      id: data.id,
      name: data.name,
      preset: data.preset,
      width: Number(data.width),
      height: Number(data.height),
      is_public: data.is_public,
    })
    setName("")
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">{t("venue.halls.create")}</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="hall-name">{t("common.name")}</Label>
          <Input
            id="hall-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hall-width">{t("common.width")}</Label>
          <Input
            id="hall-width"
            type="number"
            min={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hall-height">{t("common.height")}</Label>
          <Input
            id="hall-height"
            type="number"
            min={1}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button
          className="self-end"
          onClick={handleCreate}
          disabled={!name.trim() || width <= 0 || height <= 0 || submitting}
        >
          {t("common.create")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

const PREVIEW_MAX_W = 560
const PREVIEW_MAX_H = 280

function HallPreview({ hall }: { hall: Hall }) {
  const [tables, setTables] = useState<Array<Table>>([])
  const [fixtures, setFixtures] = useState<Array<Fixture>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      const [tablesRes, fixturesRes] = await Promise.all([
        supabase
          .from("venue_hall_tables")
          .select(
            "id, name, shape, capacity, width, height, rotation, pos_x, pos_y"
          )
          .eq("hall_id", hall.id)
          .is("deleted_at", null)
          .abortSignal(ctrl.signal),
        supabase
          .from("venue_hall_fixtures")
          .select("id, name, shape, width, height, rotation, pos_x, pos_y")
          .eq("hall_id", hall.id)
          .is("deleted_at", null)
          .abortSignal(ctrl.signal),
      ])
      if (ctrl.signal.aborted) return
      if (!tablesRes.error) {
        setTables(
          tablesRes.data.map((t) => ({
            id: t.id,
            name: t.name,
            shape: t.shape as TableShape,
            capacity: t.capacity,
            size: { width: Number(t.width), height: Number(t.height) },
            rotation: t.rotation as TableRotation,
            position: { x: Number(t.pos_x), y: Number(t.pos_y) },
          }))
        )
      }
      if (!fixturesRes.error) {
        setFixtures(
          fixturesRes.data.map((f) => ({
            id: f.id,
            name: f.name,
            shape: f.shape as FixtureShape,
            size: { width: Number(f.width), height: Number(f.height) },
            rotation: f.rotation as TableRotation,
            position: { x: Number(f.pos_x), y: Number(f.pos_y) },
          }))
        )
      }
      setLoading(false)
    })()
    return () => ctrl.abort()
  }, [hall.id])

  const ppm = Math.floor(
    Math.min(PREVIEW_MAX_W / hall.width, PREVIEW_MAX_H / hall.height)
  )

  if (loading) {
    return <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
  }

  return (
    <div className="overflow-auto rounded-md">
      <HallBackground
        hallWidth={hall.width * ppm}
        hallHeight={hall.height * ppm}
        ppm={ppm}
        gridStyle="dots"
        gridSpacing="auto"
        className="overflow-hidden border border-dashed"
      >
        {tables.map((tbl) => (
          <TableVisual key={tbl.id} table={tbl} guestsAssigned={0} ppm={ppm} />
        ))}
        {fixtures.map((fix) => (
          <FixtureVisual key={fix.id} fixture={fix} ppm={ppm} />
        ))}
      </HallBackground>
    </div>
  )
}

function HallRow({
  hall,
  onUpdated,
  onDeleted,
}: {
  hall: Hall
  onUpdated: (hall: Hall) => void
  onDeleted: (id: string) => void
}) {
  const { t } = useTranslation()
  const [showPreview, setShowPreview] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(hall.name)

  const handleRename = async () => {
    if (!name.trim() || name === hall.name) {
      setRenaming(false)
      setName(hall.name)
      return
    }
    const { error } = await supabase
      .from("venue_halls")
      .update({ name: name.trim() })
      .eq("id", hall.id)
    if (error) {
      console.error("[venue] rename hall", error)
      setName(hall.name)
    } else {
      onUpdated({ ...hall, name: name.trim() })
    }
    setRenaming(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(t("venue.halls.delete_confirm"))) return
    const { error } = await supabase
      .from("venue_halls")
      .delete()
      .eq("id", hall.id)
    if (error) {
      console.error("[venue] delete hall", error)
      return
    }
    onDeleted(hall.id)
  }

  const handleTogglePublic = async () => {
    const next = !hall.is_public
    const { error } = await supabase
      .from("venue_halls")
      .update({ is_public: next })
      .eq("id", hall.id)
    if (error) {
      console.error("[venue] toggle public", error)
      return
    }
    onUpdated({ ...hall, is_public: next })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          {renaming ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename()
                if (e.key === "Escape") {
                  setName(hall.name)
                  setRenaming(false)
                }
              }}
              autoFocus
              className="max-w-xs"
            />
          ) : (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="text-sm font-medium hover:underline"
            >
              {hall.name || t("wedding.defaults.name")}
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {hall.preset} · {hall.width}×{hall.height} m
          </span>
        </div>
        <button
          type="button"
          onClick={handleTogglePublic}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {hall.is_public ? t("venue.halls.public") : t("venue.halls.private")}
        </button>
        <Link
          to="/venue/halls/$id"
          params={{ id: hall.id }}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
        >
          {t("venue.halls.edit_layout")}
        </Link>
        <Button variant="outline" size="sm" onClick={handleDelete}>
          {t("venue.halls.delete")}
        </Button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="rounded-md border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={showPreview ? "Hide preview" : "Show preview"}
        >
          {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {showPreview && <HallPreview hall={hall} />}
    </div>
  )
}
