import { CheckIcon, XIcon } from "lucide-react"

/**
 * One half of the grant dialog's disclosure: either what the venue will see or
 * what it never sees.
 *
 * Both halves render identically apart from the glyph, on purpose. The
 * "hidden" list is not fine print under the "shared" list - it carries the same
 * weight, because "the venue never receives guest names" is the load-bearing
 * half of what makes the consent an informed one.
 */
export const VenueDisclosureList = ({
  title,
  tone,
  items,
}: {
  title: string
  tone: "shared" | "hidden"
  items: Array<string>
}) => (
  <div className="flex flex-col gap-1">
    <p className="text-sm font-medium">{title}</p>
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm">
          {tone === "shared" ? (
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
)
