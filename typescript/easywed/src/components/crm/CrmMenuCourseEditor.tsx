import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"

import { CrmConfirmButton } from "./CrmConfirmButton"
import { CrmMenuOptionRow } from "./CrmMenuOptionRow"
import type {
  CrmMenuCourse,
  CrmMenuOption,
  useTenantMenus,
} from "./useTenantMenus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Switch } from "@/components/ui/switch"
import { TagBadge } from "@/components/ui/tag-badge"
import {
  MAX_CHOOSE_COUNT,
  MAX_COURSE_NAME_LENGTH,
  MAX_SERVING_NOTE_LENGTH,
  MIN_CHOOSE_COUNT,
  canonicalizeDishName,
  parseChooseCount,
} from "@/lib/menu"

/**
 * One course, its rule, and its dishes.
 *
 * The two fields worth understanding are next to each other on purpose:
 *
 *   - `choose_count` is the number the client turns into "(do wyboru 5
 *     pozycji)". The venue types the number; the sentence is translated, which
 *     is why it needs Polish `_one`/`_few`/`_many` forms.
 *   - `per_guest_choice` is the whole two-shapes decision. Off, the couple
 *     picks dishes for everyone. On, the couple narrows the list and each guest
 *     is then assigned one of the survivors - the MENU SERWOWANE shape.
 */
export const CrmMenuCourseEditor = ({
  course,
  options,
  isFirst,
  isLast,
  menus,
}: {
  course: CrmMenuCourse
  options: Array<CrmMenuOption>
  isFirst: boolean
  isLast: boolean
  menus: ReturnType<typeof useTenantMenus>
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [servingNote, setServingNote] = useState<string | null>(null)
  const [newDish, setNewDish] = useState("")

  const commitName = () => {
    const next = (name ?? "").trim().slice(0, MAX_COURSE_NAME_LENGTH)
    setName(null)
    if (next.length > 0 && next !== course.name) {
      void menus.saveCourse(course.id, { name: next })
    }
  }

  const commitServingNote = () => {
    const raw = (servingNote ?? "").trim().slice(0, MAX_SERVING_NOTE_LENGTH)
    const next = raw.length > 0 ? raw : null
    setServingNote(null)
    if (next !== course.serving_note) {
      void menus.saveCourse(course.id, { serving_note: next })
    }
  }

  /**
   * `choose_count`, committed on blur like every other field on this screen.
   *
   * It used to save on every keystroke, because `NumberInput` reports each
   * parseable value as the user types. Typing "60" therefore wrote 6, then
   * clamped 60 down and wrote 50 - two writes of a rule no staff member chose,
   * the second of them landing while the field still read "60". A couple
   * looking at the menu in between was told to pick six dishes.
   *
   * Reads the raw text off the event rather than a parsed draft, so an emptied
   * field reverts instead of committing whatever was last parseable out of it -
   * the contract `NumberInput` states for its own draft, kept here.
   */
  const commitChooseCount = (raw: string) => {
    const next = parseChooseCount(raw)
    if (next !== null && next !== course.choose_count) {
      void menus.saveCourse(course.id, { choose_count: next })
    }
  }

  const addDish = () => {
    const next = canonicalizeDishName(newDish)
    if (!next) return
    setNewDish("")
    void menus.createOption(course.id, next)
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col">
          <Button
            size="icon"
            variant="ghost"
            className="size-5"
            disabled={isFirst}
            aria-label={t("crm.menus.move_up")}
            onClick={() =>
              void menus.moveCourse(course.menu_package_id, course.id, -1)
            }
          >
            <ChevronUpIcon />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-5"
            disabled={isLast}
            aria-label={t("crm.menus.move_down")}
            onClick={() =>
              void menus.moveCourse(course.menu_package_id, course.id, 1)
            }
          >
            <ChevronDownIcon />
          </Button>
        </div>

        <Input
          className="min-w-40 flex-1 font-medium"
          maxLength={MAX_COURSE_NAME_LENGTH}
          value={name ?? course.name}
          aria-label={t("crm.menus.course_name")}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />

        {course.per_guest_choice ? (
          <TagBadge tone="violet">{t("crm.menus.per_guest_badge")}</TagBadge>
        ) : null}

        <CrmConfirmButton
          disabled={menus.saving}
          onConfirm={() => void menus.deleteCourse(course.id)}
          label={t("crm.menus.delete_course")}
          confirmLabel={t("crm.menus.delete_confirm")}
          icon={<TrashIcon />}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`choose-${course.id}`}>
            {t("crm.menus.choose_count")}
          </Label>
          <NumberInput
            id={`choose-${course.id}`}
            className="w-24"
            min={MIN_CHOOSE_COUNT}
            max={MAX_CHOOSE_COUNT}
            value={course.choose_count}
            // Nothing on change, deliberately. `NumberInput` already holds the
            // raw text in its own draft while the field has focus, so `value`
            // is not read until it is committed - there is no second draft to
            // keep here, and the one thing a change handler could do is the
            // per-keystroke write this field is being taken off.
            onValueChange={() => {}}
            onBlur={(e) => commitChooseCount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <p className="text-xs text-muted-foreground">
            {t("crm.menus.choose_count_preview", {
              count: course.choose_count,
            })}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`serving-${course.id}`}>
            {t("crm.menus.serving_note")}
          </Label>
          <Input
            id={`serving-${course.id}`}
            maxLength={MAX_SERVING_NOTE_LENGTH}
            placeholder={t("crm.menus.serving_note_placeholder")}
            value={servingNote ?? course.serving_note ?? ""}
            onChange={(e) => setServingNote(e.target.value)}
            onBlur={commitServingNote}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Switch
            id={`per-guest-${course.id}`}
            checked={course.per_guest_choice}
            onCheckedChange={(checked) =>
              void menus.saveCourse(course.id, { per_guest_choice: checked })
            }
          />
          <Label htmlFor={`per-guest-${course.id}`}>
            {t("crm.menus.per_guest_choice")}
          </Label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("crm.menus.per_guest_help")}
      </p>

      <ul className="flex flex-col gap-2">
        {options.map((option, index) => (
          <CrmMenuOptionRow
            key={option.id}
            option={option}
            isFirst={index === 0}
            isLast={index === options.length - 1}
            onSave={(patch) => void menus.saveOption(option.id, patch)}
            onMove={(delta) =>
              void menus.moveOption(course.id, option.id, delta)
            }
            onDelete={() => void menus.deleteOption(option.id)}
            saving={menus.saving}
          />
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          className="max-w-80"
          placeholder={t("crm.menus.add_dish_placeholder")}
          value={newDish}
          onChange={(e) => setNewDish(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDish()}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={menus.saving}
          onClick={addDish}
        >
          <PlusIcon />
          {t("crm.menus.add_dish")}
        </Button>
      </div>
    </li>
  )
}
