import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useInvitationStore } from "@/stores/invitation.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"

export function GuestNamesPicker() {
  const { t } = useTranslation()
  const guestNames = useInvitationStore((s) => s.design.guestNames)
  const addGuestName = useInvitationStore((s) => s.addGuestName)
  const removeGuestName = useInvitationStore((s) => s.removeGuestName)
  const plannerGuests = usePlannerStore((s) => s.guests)
  const addPlannerGuest = usePlannerStore((s) => s.addGuest)
  const weddingId = useGlobalStore((s) => s.weddingId)

  const [search, setSearch] = useState("")
  const [manualInput, setManualInput] = useState("")
  const [open, setOpen] = useState(false)

  const GUEST_CAP = 500
  const atCap = guestNames.length >= GUEST_CAP
  const hasPlannerGuests = plannerGuests.length > 0

  const unaddedPlannerGuests = plannerGuests.filter(
    (g) => !guestNames.includes(g.name)
  )
  const filteredPlannerGuests = unaddedPlannerGuests.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase().trim())
  )

  const handleAddManual = () => {
    const name = manualInput.trim()
    if (!name) return
    // If inside a loaded wedding, persist the new guest to the DB via the planner store
    if (weddingId) {
      addPlannerGuest({ name, dietary: [], tableId: null })
    }
    addGuestName(name)
    setManualInput("")
  }

  const handleAddFromPlanner = (name: string) => {
    addGuestName(name)
    setSearch("")
  }

  return (
    <div className="flex flex-col gap-2">
      {hasPlannerGuests ? (
        /* ── Authenticated: searchable popover with manual-add fallback ── */
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={atCap}
              className="w-full justify-between font-normal"
            >
              <span
                className={
                  guestNames.length === 0 ? "text-muted-foreground" : undefined
                }
              >
                {guestNames.length === 0
                  ? t("invitations.guests_pick_placeholder")
                  : t("invitations.guests_selected_count", {
                      count: guestNames.length,
                    })}
              </span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-(--radix-popover-trigger-width) p-3"
            align="start"
          >
            {/* Search through planner guests */}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("tables.guests_search_placeholder")}
              maxLength={200}
              className="mb-2"
            />

            {filteredPlannerGuests.length > 0 ? (
              <div className="max-h-40 space-y-0.5 overflow-y-auto">
                {filteredPlannerGuests.map((g) => (
                  <button
                    key={g.id}
                    disabled={atCap}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    onClick={() => handleAddFromPlanner(g.name)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-1 text-xs text-muted-foreground">
                {search.trim()
                  ? t("tables.guests_no_match")
                  : t("invitations.guests_all_added")}
              </p>
            )}

            <Separator className="my-2" />

            {/* Manual add for guests not in the planner list */}
            <div className="flex gap-2">
              <Input
                value={manualInput}
                placeholder={t("invitations.guests_add_placeholder")}
                maxLength={200}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddManual()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!manualInput.trim() || atCap}
                onClick={handleAddManual}
              >
                {t("invitations.guests_add")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        /* ── Anonymous: direct input ── */
        <div className="flex gap-2">
          <Input
            value={manualInput}
            placeholder={t("invitations.guests_add_placeholder")}
            maxLength={200}
            disabled={atCap}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddManual()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!manualInput.trim() || atCap}
            onClick={handleAddManual}
          >
            {t("invitations.guests_add")}
          </Button>
        </div>
      )}

      {/* Selected guests — readable list, not pills */}
      {guestNames.length > 0 && (
        <>
          <div className="max-h-52 divide-y overflow-y-auto rounded-md border">
            {guestNames.map((name, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-1.5"
              >
                <span className="text-sm">{name}</span>
                <button
                  aria-label={t("invitations.guests_remove", { name })}
                  onClick={() => removeGuestName(idx)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p
            className={`text-xs ${atCap ? "font-medium text-destructive" : "text-muted-foreground"}`}
          >
            {atCap
              ? t("invitations.guests_cap_reached", { count: GUEST_CAP })
              : `${guestNames.length} / ${GUEST_CAP}`}
          </p>
        </>
      )}
    </div>
  )
}
