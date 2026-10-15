import { useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

/**
 * A destructive action that asks twice: the first click arms it, the second
 * performs it, and it disarms itself after a few seconds.
 *
 * Used for the three hard deletes in the menu editor. Archiving is the default
 * action beside this one and costs nobody anything; DELETE exists because typos
 * happen before anyone has ordered.
 *
 * Two clicks rather than a modal, deliberately: a dialog for every row in a
 * thirty-dish list is the friction people learn to click through without
 * reading, and this screen is a list of small cheap destructive actions.
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
   * Held while another write is in flight. These deletes cascade: firing a
   * second at a screen whose optimistic state is mid-repair is how a
   * restore-on-failure puts back a row the next delete already took away.
   */
  disabled?: boolean
}) => {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintId = useId()

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  // One button across both states, not a branch returning two: two elements
  // meant the click that armed it unmounted the thing under the user's finger,
  // dropping keyboard and screen-reader focus at the moment the label changed.
  //
  // Both sr-only spans sit *outside* the button. Inside, they would join the
  // name computation in the armed state (no aria-label to override them), and a
  // live region nested in the focused control is what assistive tech handles
  // least reliably. `sr-only` is absolutely positioned, so neither affects layout.
  return (
    <>
      <Button
        size="sm"
        variant={armed ? "destructive" : "ghost"}
        // Resting, the button is an icon and needs a name given to it. Armed, it
        // has visible text, and that text has to *be* the name - an aria-label
        // saying something else is the Label-in-Name failure where a
        // voice-control user reads "delete permanently" and says it to nothing.
        // The hint is a description either way, since aria-label overrides inner
        // content.
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
