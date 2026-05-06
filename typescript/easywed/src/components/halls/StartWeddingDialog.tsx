import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import type { HallCatalogEntry } from "./HallCatalog"
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
import { supabase } from "@/lib/supabase"


export function StartWeddingDialog({
  hall,
  onOpenChange,
}: {
  hall: HallCatalogEntry | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [date, setDate] = useState<Date | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName("")
    setDate(undefined)
    setError(null)
  }

  const handleStart = async () => {
    if (!hall || !name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc(
      "start_wedding_from_hall",
      {
        _hall_id: hall.id,
        _name: name.trim(),
        _date: date ? date.toISOString().slice(0, 10) : null,
      }
    )
    setSubmitting(false)

    if (rpcError || !data) {
      setError(rpcError?.message ?? t("halls.start_dialog.error"))
      return
    }

    onOpenChange(false)
    reset()
    navigate({ to: "/wedding/$id", params: { id: data } })
  }

  return (
    <Dialog
      open={hall !== null}
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false)
          reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("halls.start_dialog.title")}</DialogTitle>
        </DialogHeader>
        <Field className="w-full">
          <FieldLabel htmlFor="start-wedding-name">
            {t("halls.start_dialog.name")}
          </FieldLabel>
          <Input
            id="start-wedding-name"
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              reset()
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleStart} disabled={!name.trim() || submitting}>
            {t("halls.start_dialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
