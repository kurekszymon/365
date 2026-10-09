import * as React from "react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const notificationDotVariants = cva(
  "pointer-events-none inline-flex shrink-0 rounded-full",
  {
    variants: {
      // `corner` pins the dot to the top-right of the nearest positioned
      // ancestor - put it inside a `relative` button or icon. `inline` sits in
      // the flow, e.g. at the end of a menu item's label.
      placement: {
        corner: "absolute -top-1 -right-1",
        inline: "relative",
      },
      size: {
        default: "size-2.5",
        sm: "size-2",
      },
    },
    defaultVariants: {
      placement: "corner",
      size: "default",
    },
  }
)

/**
 * A red "something new here" marker for buttons, menu items and tabs. It is
 * generic on purpose: it knows nothing about *what* is new, only whether to
 * show and whether to pulse. The caller owns the "seen" state.
 *
 * Renders nothing when `show` is false, so callers can mount it
 * unconditionally. The dot is decorative to sighted users, so `label` is
 * announced to screen readers instead - pass one whenever the dot is the only
 * signal (it usually is).
 */
function NotificationDot({
  show = true,
  pulse = false,
  label,
  placement,
  size,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof notificationDotVariants> & {
    show?: boolean
    /** Adds a ping halo. Off under `prefers-reduced-motion`. */
    pulse?: boolean
    /** Screen-reader text, e.g. "New release notes". */
    label?: string
  }) {
  if (!show) return null

  return (
    <span
      data-slot="notification-dot"
      className={cn(notificationDotVariants({ placement, size, className }))}
      {...props}
    >
      {pulse && (
        <span
          aria-hidden
          className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75 motion-reduce:hidden"
        />
      )}
      {/* The ring separates the dot from whatever border it overlaps. */}
      <span
        aria-hidden
        className="relative inline-flex size-full rounded-full bg-destructive ring-2 ring-background"
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export { NotificationDot, notificationDotVariants }
