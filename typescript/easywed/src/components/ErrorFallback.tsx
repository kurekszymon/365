import { useTranslation } from "react-i18next"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

// Shared fallback for TanStack Router `errorComponent` slots. Catches render
// crashes (not data-load errors, which routes handle inline) so a thrown error
// in the canvas/panel shows a recoverable screen instead of a blank page.
export function ErrorFallback({ reset }: Partial<ErrorComponentProps>) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-center">
      <p className="text-2xl font-semibold">{t("errors.crashed_title")}</p>
      <p className="text-muted-foreground">{t("errors.crashed_desc")}</p>
      <Button onClick={() => (reset ? reset() : window.location.reload())}>
        {t("errors.reload")}
      </Button>
    </div>
  )
}
