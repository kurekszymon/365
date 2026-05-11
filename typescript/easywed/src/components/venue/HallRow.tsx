import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import type { Hall } from "@/lib/venue/types"
import { deleteHall, renameHall, toggleHallPublic } from "@/lib/sync/mutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HallRow({
  hall,
  onUpdated,
  onDeleted,
}: {
  hall: Hall
  onUpdated: (hall: Hall) => void
  onDeleted: (id: string) => void
}) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(hall.name)

  const handleRename = async () => {
    if (!name.trim() || name === hall.name) {
      setRenaming(false)
      setName(hall.name)
      return
    }
    const ok = await renameHall(hall.id, name.trim())
    if (!ok) {
      setName(hall.name)
    } else {
      onUpdated({ ...hall, name: name.trim() })
    }
    setRenaming(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(t("venue.halls.delete_confirm"))) return
    const ok = await deleteHall(hall.id)
    if (ok) onDeleted(hall.id)
  }

  const handleTogglePublic = async () => {
    const next = !hall.is_public
    const ok = await toggleHallPublic(hall.id, next)
    if (ok) onUpdated({ ...hall, is_public: next })
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
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
    </div>
  )
}
