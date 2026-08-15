import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type OnboardingStepRowProps = {
  /** 1-based, shown in the badge until the step completes. */
  index: number
  title: string
  /** Live state under the title - "3 tables on the plan", "0/12 seated". */
  detail: string
  done: boolean
  ctaLabel: string
  onCta: () => void
}

export const OnboardingStepRow = ({
  index,
  title,
  detail,
  done,
  ctaLabel,
  onCta,
}: OnboardingStepRowProps) => {
  return (
    <li className="flex items-center gap-2.5">
      {/* Keyed on `done` so the swap from number to tick remounts the span and
          the zoom-in actually replays - a plain class toggle on a live element
          is easy to miss, and this tick is the whole reward for the step. */}
      <span
        key={done ? "done" : "todo"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
          done
            ? "animate-in bg-primary text-primary-foreground duration-200 zoom-in-50"
            : "bg-muted text-muted-foreground"
        )}
      >
        {done ? <CheckIcon className="size-3" /> : index}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] leading-tight font-medium transition-colors",
            done && "text-muted-foreground"
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {detail}
        </p>
      </div>

      {/* The CTA retires with the step: a finished row is a receipt, not an
          action, and three permanent buttons would out-shout the canvas. */}
      {!done && (
        <Button size="xs" variant="outline" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </li>
  )
}
