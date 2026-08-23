import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"

import { CrmConfirmButton } from "./CrmConfirmButton"
import { CrmMenuCourseEditor } from "./CrmMenuCourseEditor"
import type { CrmMenuPackage, useTenantMenus } from "./useTenantMenus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  MAX_COURSE_NAME_LENGTH,
  MAX_PACKAGE_DESCRIPTION_LENGTH,
  MAX_PACKAGE_NAME_LENGTH,
} from "@/lib/menu"
import { formatMoney, parsePriceInput } from "@/lib/money"

/**
 * One package: its name, its per-person price, and its courses in order.
 *
 * The price field is text rather than a number input, and that is deliberate.
 * A venue types "435,50" and pastes "435,50 zł" straight out of this screen;
 * `parsePriceInput` accepts both, including the no-break spaces Polish `Intl`
 * emits, and rejects anything it cannot read rather than silently storing a
 * wrong amount. A `<input type="number">` would refuse the comma outright on a
 * Polish keyboard layout.
 *
 * No total is shown anywhere - only the per-person price. Extras (fontanna
 * czekolady, opłata korkowa) and the age-tier multipliers land with bookings,
 * and a "total" computed without them would be a quote that is wrong.
 */
export const CrmMenuPackageEditor = ({
  pkg,
  menus,
}: {
  pkg: CrmMenuPackage
  menus: ReturnType<typeof useTenantMenus>
}) => {
  const { t, i18n } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [price, setPrice] = useState<string | null>(null)
  const [priceInvalid, setPriceInvalid] = useState(false)
  const [newCourse, setNewCourse] = useState("")

  const archived = pkg.archived_at !== null
  const courses = menus.courses.filter((c) => c.menu_package_id === pkg.id)

  const commitName = () => {
    const next = (name ?? "").trim().slice(0, MAX_PACKAGE_NAME_LENGTH)
    setName(null)
    if (next.length > 0 && next !== pkg.name) {
      void menus.savePackage(pkg.id, { name: next })
    }
  }

  const commitDescription = () => {
    const raw = (description ?? "")
      .trim()
      .slice(0, MAX_PACKAGE_DESCRIPTION_LENGTH)
    const next = raw.length > 0 ? raw : null
    setDescription(null)
    if (next !== pkg.description) {
      void menus.savePackage(pkg.id, { description: next })
    }
  }

  const commitPrice = () => {
    if (price === null) return
    const minor = parsePriceInput(price)

    if (minor === null) {
      // The draft is kept, not reverted: the venue is looking at what they
      // typed, and blanking it takes away the thing they need to correct.
      setPriceInvalid(true)
      return
    }

    setPriceInvalid(false)
    setPrice(null)
    if (minor !== pkg.price_per_person_minor) {
      void menus.savePackage(pkg.id, { price_per_person_minor: minor })
    }
  }

  const addCourse = () => {
    const next = newCourse.trim().slice(0, MAX_COURSE_NAME_LENGTH)
    if (next.length === 0) return
    setNewCourse("")
    void menus.createCourse(pkg.id, next)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-48 flex-1 font-heading text-lg"
          maxLength={MAX_PACKAGE_NAME_LENGTH}
          value={name ?? pkg.name}
          aria-label={t("crm.menus.package_name")}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void menus.savePackage(pkg.id, {
              archived_at: archived ? null : new Date().toISOString(),
            })
          }
        >
          {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
          {archived ? t("crm.menus.restore") : t("crm.menus.archive")}
        </Button>

        <CrmConfirmButton
          onConfirm={() => void menus.deletePackage(pkg.id)}
          label={t("crm.menus.delete_package")}
          confirmLabel={t("crm.menus.delete_confirm")}
          icon={<TrashIcon />}
        />
      </div>

      {archived ? (
        <p className="text-sm text-muted-foreground">
          {t("crm.menus.archived_notice")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`price-${pkg.id}`}>{t("crm.menus.price")}</Label>
          <Input
            id={`price-${pkg.id}`}
            className="w-40"
            inputMode="decimal"
            aria-invalid={priceInvalid}
            value={
              price ??
              formatMoney(
                pkg.price_per_person_minor,
                menus.currency,
                i18n.language
              )
            }
            onChange={(e) => {
              setPrice(e.target.value)
              setPriceInvalid(false)
            }}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <p
            className={`text-xs ${
              priceInvalid ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {priceInvalid
              ? t("crm.menus.price_invalid")
              : t("crm.menus.price_help")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`description-${pkg.id}`}>
          {t("crm.menus.description")}
        </Label>
        <Textarea
          id={`description-${pkg.id}`}
          rows={2}
          maxLength={MAX_PACKAGE_DESCRIPTION_LENGTH}
          value={description ?? pkg.description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-base font-semibold">
          {t("crm.menus.courses_title")}
        </h3>

        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("crm.menus.courses_empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {courses.map((course, index) => (
              <CrmMenuCourseEditor
                key={course.id}
                course={course}
                options={menus.options.filter(
                  (option) => option.menu_course_id === course.id
                )}
                isFirst={index === 0}
                isLast={index === courses.length - 1}
                menus={menus}
              />
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Input
            className="max-w-80"
            placeholder={t("crm.menus.add_course_placeholder")}
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCourse()}
          />
          <Button size="sm" variant="outline" onClick={addCourse}>
            <PlusIcon />
            {t("crm.menus.add_course")}
          </Button>
        </div>
      </div>
    </div>
  )
}
