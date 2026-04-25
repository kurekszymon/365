import { useState } from "react"
import { useTranslation } from "react-i18next"
import { MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useInvitationStore } from "@/stores/invitation.store"
import { useGlobalStore } from "@/stores/global.store"
import { encodeDesign } from "@/lib/invitation/hash"
import { supabase } from "@/lib/supabase"

interface OrderForm {
  contactName: string
  contactEmail: string
  contactPhone: string
  notes: string
}

const EMPTY_FORM: OrderForm = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
}

export function OrderDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<OrderForm>(EMPTY_FORM)
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle")

  const design = useInvitationStore((s) => s.design)
  const weddingId = useGlobalStore((s) => s.weddingId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")

    try {
      const { error } = await supabase.from("invitation_orders").insert({
        contact_name: form.contactName,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone || null,
        quantity: design.quantity,
        design_hash: encodeDesign(design),
        notes: form.notes || null,
        wedding_id: weddingId ?? null,
      })

      if (error) throw error

      // Fire-and-forget the notification edge function
      void supabase.functions.invoke("notify-invitation-order", {
        body: {
          designHash: encodeDesign(design),
          contactEmail: form.contactEmail,
        },
      })

      setStatus("success")
      setForm(EMPTY_FORM)
    } catch {
      setStatus("error")
    }
  }

  const field = (key: keyof OrderForm, type = "text") => ({
    value: form[key],
    type,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true)
          setStatus("idle")
        }}
      >
        <MailIcon />
        {t("invitations.order")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("invitations.order_title")}</DialogTitle>
          </DialogHeader>

          {status === "success" ? (
            <div className="py-4 text-center">
              <p className="font-medium text-green-700">
                {t("invitations.order_success")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("invitations.order_success_detail")}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("common.close")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="order-name">
                  {t("invitations.order_name")}
                </label>
                <Input id="order-name" required {...field("contactName")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="order-email">
                  {t("invitations.order_email")}
                </label>
                <Input
                  id="order-email"
                  required
                  {...field("contactEmail", "email")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="order-phone">
                  {t("invitations.order_phone")}
                </label>
                <Input id="order-phone" {...field("contactPhone", "tel")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="order-notes">
                  {t("invitations.order_notes")}
                </label>
                <textarea
                  id="order-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">
                  {t("invitations.order_quantity_summary", {
                    count: design.quantity,
                  })}
                </p>
              </div>

              {status === "error" && (
                <p className="text-sm text-red-600">
                  {t("invitations.order_error")}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={status === "submitting"}>
                  {status === "submitting"
                    ? t("invitations.order_submitting")
                    : t("invitations.order_submit")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
