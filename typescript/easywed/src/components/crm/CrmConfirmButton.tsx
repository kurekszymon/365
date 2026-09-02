import { useEffect, useId, useRef, useState } from "react"
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
  const hintId = useId()

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  // One button across both states rather than a branch that returns two.
  //
  // Two elements meant the click that armed it unmounted the thing under the
  // user's finger, so keyboard and screen-reader focus was dropped on the floor
  // at exactly the moment the label changed. Keeping the element mounted keeps
  // focus on it, and the live region below is then what says what happened.
  //
  // Both sr-only spans sit outside the button, not inside it. Inside, they
  // would be part of the name computation in the armed state (where there is no
  // aria-label to override them), and a live region nested in the control that
  // is currently focused is the case assistive tech handles least reliably.
  // `sr-only` is absolutely positioned, so neither affects the parent's layout.
  return (
    <>
      <Button
        size="sm"
        variant={armed ? "destructive" : "ghost"}
        // Resting, the button is an icon and needs a name given to it. Armed,
        // it has visible text, and that text has to *be* the name - an
        // aria-label saying something else is the Label-in-Name failure where a
        // voice-control user reads "delete permanently" and says it to nothing.
        //
        // The hint is a description either way, which is the actual fix for the
        // original bug: aria-label overrides inner content, so the sr-only hint
        // that used to live inside the button was announced to nobody.
        aria-label={armed ? undefined : label}
        aria-describedby={armed ? undefined : hintId}
        title={armed ? confirmLabel : label}
        disabled={disabled}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current)

          if (armed) {
            setArmed(false)
            onConfirm()
            return
          }

          setArmed(true)
          // Disarms itself, so a half-pressed delete does not sit waiting for a
          // stray click ten minutes later.
          timer.current = setTimeout(() => setArmed(false), 4000)
        }}
      >
        {armed ? confirmLabel : icon}
      </Button>

      <span id={hintId} className="sr-only">
        {t("crm.menus.confirm_hint")}
      </span>

      {/* Arming keeps focus where it was and swaps the label under it, which is
          precisely the change a screen reader is least likely to volunteer - so
          it is announced here instead. */}
      <span role="status" className="sr-only">
        {armed ? confirmLabel : ""}
      </span>
    </>
  )
}
