import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

/**
 * A destructive action that asks twice: the first click arms it, the second
 * performs it, and it disarms itself after a few seconds.
 *
 * Used for the three hard deletes in the menu editor, where the risk is real
 * and stated in the migration: deleting a dish a couple already chose blanks
 * their choice, because `guests.menu_option_id` is `on delete set null`.
 * Archiving is the default action offered beside this one and costs nobody
 * anything; DELETE exists because typos happen before anyone has ordered.
 *
 * Two clicks rather than a modal deliberately. A dialog for every row in a
 * thirty-dish list is the kind of friction people learn to click through
 * without reading, and this screen is a list of small, individually cheap
 * destructive actions rather than one big one.
 */
export const CrmConfirmButton = ({
  onConfirm,
  label,
  confirmLabel,
  icon,
  disabled = false,
}: {
  onConfirm: () => void
  /** Accessible name in the resting state. */
  label: string
  /** Visible text once armed - it has to say what is about to happen. */
  confirmLabel: string
  icon: React.ReactNode
  /**
   * Held while another write is in flight.
   *
   * These are the hard deletes, and they cascade: firing a second one at a
   * screen whose optimistic state is mid-repair is how a restore-on-failure
   * puts back a row the next delete has already taken away.
   */
  disabled?: boolean
}) => {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  if (armed) {
    return (
      <Button
        size="sm"
        variant="destructive"
        disabled={disabled}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current)
          setArmed(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => {
        setArmed(true)
        // Disarms itself, so a half-pressed delete does not sit waiting for a
        // stray click ten minutes later.
        timer.current = setTimeout(() => setArmed(false), 4000)
      }}
    >
      {icon}
      <span className="sr-only">{t("crm.menus.confirm_hint")}</span>
    </Button>
  )
}
