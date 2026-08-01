import { Badge } from "@/components/ui/badge"
import type { TagTone } from "@/lib/tagTone"
import { TAG_TONE_BADGE } from "@/lib/tagTone"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

/**
 * A read-only pill in one of the tag tones - the dietary tags and child age
 * brackets on a guest row. Built on `Badge`'s `outline` variant, whose
 * `border-border text-foreground` the tone classes override through
 * tailwind-merge.
 */
export const TagBadge = ({
  tone,
  className,
  ...props
}: ComponentProps<typeof Badge> & { tone: TagTone }) => (
  <Badge
    variant="outline"
    className={cn(TAG_TONE_BADGE[tone], className)}
    {...props}
  />
)
