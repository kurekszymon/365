import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/datepicker"
import { Field, FieldLabel } from "@/components/ui/field"

import { useDialogStore } from "@/stores/dialog.store"
import { useAuthStore } from "@/stores/auth.store"
import { supabase } from "@/lib/supabase"

export const WeddingCreateDialog = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const opened = useDialogStore((s) => s.opened)
  const close = useDialogStore((s) => s.close)
  const session = useAuthStore((s) => s.session)

  const [name, setName] = useState("")
  const [date, setDate] = useState<Date | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName("")
    setDate(undefined)
  }

  const handleSave = async () => {
    if (!name.trim() || !session || submitting) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from("weddings")
      .insert({
        owner_id: session.user.id,
        name: name.trim(),
        date: date ? date.toISOString().slice(0, 10) : null,
      })
      .select("id")
      .single()

    setSubmitting(false)
    if (error) {
      console.error(error)
      return
    }
    close()
    reset()
    navigate({ to: "/wedding/$id", params: { id: data.id } })
  }

  return (
    <Dialog
      open={opened === "Wedding.Create"}
      onOpenChange={(next) => {
        if (!next) {
          close()
          reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("wedding.create.title")}</DialogTitle>
        </DialogHeader>
        <Field className="w-full">
          <FieldLabel htmlFor="wedding-name-input">
            {t("common.name")}
          </FieldLabel>
          <Input
            id="wedding-name-input"
            placeholder={t("wedding.create.title_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </Field>
        <DatePicker
          date={date}
          setDate={setDate}
          info={t("wedding.create.date_info")}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              close()
              reset()
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || submitting}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
