import { useTranslation } from "react-i18next"
import { InfoIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useInvitationStore } from "@/stores/invitation.store"

export function QuantityPicker() {
  const { t } = useTranslation()
  const quantity = useInvitationStore((s) => s.design.quantity)
  const guestCount = useInvitationStore((s) => s.design.guestNames.length)
  const updateDesign = useInvitationStore((s) => s.updateDesign)

  const suggested = guestCount > 0 ? Math.ceil(guestCount * 1.12) : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor="invitation-qty">
          {t("invitations.quantity_label")}
        </label>
        {suggested != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              {t("invitations.quantity_suggestion", { count: suggested })}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Input
        id="invitation-qty"
        type="number"
        min={1}
        max={1000}
        value={quantity}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v > 0) updateDesign({ quantity: Math.min(v, 1000) })
        }}
        className="w-28"
      />
      {suggested != null && quantity !== suggested && (
        <p className="text-xs text-muted-foreground">
          {t("invitations.quantity_suggestion", { count: suggested })}
          {" — "}
          <button
            className="text-primary underline underline-offset-2"
            onClick={() => updateDesign({ quantity: suggested })}
          >
            {t("invitations.quantity_use_suggestion")}
          </button>
        </p>
      )}
      {guestCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("invitations.quantity_guests_source", { count: guestCount })}
        </p>
      )}
    </div>
  )
}
