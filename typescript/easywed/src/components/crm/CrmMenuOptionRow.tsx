import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from "lucide-react"

import { CrmConfirmButton } from "./CrmConfirmButton"
import type { CrmMenuOption } from "./useTenantMenus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MAX_DISH_NAME_LENGTH,
  MAX_DISH_NOTE_LENGTH,
  canonicalizeLine,
  isLive,
  toggleArchivedAt,
} from "@/lib/menu"

/**
 * One dish.
 *
 * Both text fields commit on blur rather than on every keystroke: a dish name
 * is 96 characters of Polish, and a write per character is a write per
 * character. The draft is local until then, so an abandoned edit costs nothing.
 *
 * Nothing here routes a dish name through `t()`. It is text the venue typed -
 * see `dishLabel` in @/lib/menu for why there is deliberately no translated
 * variant.
 */
export const CrmMenuOptionRow = ({
  option,
  isFirst,
  isLast,
  onSave,
  onMove,
  onDelete,
  saving,
}: {
  option: CrmMenuOption
  isFirst: boolean
  isLast: boolean
  onSave: (patch: Partial<CrmMenuOption>) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
  /** A write is in flight somewhere on this screen - see CrmConfirmButton. */
  saving: boolean
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const archived = !isLive(option)

  const commitName = () => {
    if (name === null) return
    const next = canonicalizeLine(name, MAX_DISH_NAME_LENGTH)
    setName(null)
    // A blank is a cancelled edit, not a request to store an empty dish - the
    // CHECK would refuse it anyway.
    if (next && next !== option.name) onSave({ name: next })
  }

  // The `null` bail matters on a nullable field: with no draft there is nothing
  // to commit, and canonicalizing the absent one produced `null` - so tabbing
  // through an untouched note wrote an UPDATE clearing it.
  const commitNote = () => {
    if (note === null) return
    const next = canonicalizeLine(note, MAX_DISH_NOTE_LENGTH)
    setNote(null)
    if (next !== option.note) onSave({ note: next })
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 ${
        archived ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col">
        <Button
          size="icon"
          variant="ghost"
          className="size-5"
          disabled={isFirst}
          aria-label={t("crm.menus.move_up")}
          onClick={() => onMove(-1)}
        >
          <ChevronUpIcon />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-5"
          disabled={isLast}
          aria-label={t("crm.menus.move_down")}
          onClick={() => onMove(1)}
        >
          <ChevronDownIcon />
        </Button>
      </div>

      <Input
        className="min-w-40 flex-1"
        maxLength={MAX_DISH_NAME_LENGTH}
        value={name ?? option.name}
        aria-label={t("crm.menus.dish_name")}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />

      <Input
        className="w-40"
        maxLength={MAX_DISH_NOTE_LENGTH}
        value={note ?? option.note ?? ""}
        placeholder={t("crm.menus.dish_note_placeholder")}
        aria-label={t("crm.menus.dish_note")}
        onChange={(e) => setNote(e.target.value)}
        onBlur={commitNote}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />

      {/* Archive is the default remove action, and the distinction is not
          cosmetic: a dish a couple already ordered has to keep its name on the
          kitchen report, so retiring last year's offer must not delete it. */}
      <Button
        size="sm"
        variant="ghost"
        aria-label={archived ? t("crm.menus.restore") : t("crm.menus.archive")}
        title={archived ? t("crm.menus.restore") : t("crm.menus.archive")}
        onClick={() => onSave({ archived_at: toggleArchivedAt(option) })}
      >
        {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
      </Button>

      <CrmConfirmButton
        disabled={saving}
        onConfirm={onDelete}
        label={t("crm.menus.delete_dish")}
        confirmLabel={t("crm.menus.delete_confirm")}
        icon={<TrashIcon />}
      />
    </li>
  )
}
