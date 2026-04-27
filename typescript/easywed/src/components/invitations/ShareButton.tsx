import { useEffect, useRef, useState } from "react"
import { CheckIcon, LinkIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ShareButton() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      const publicUrl = `${window.location.origin}/invitations${window.location.hash}`
      await navigator.clipboard.writeText(publicUrl)
      if (timerRef.current) clearTimeout(timerRef.current)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable (non-HTTPS or denied permission) — fail silently
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? <CheckIcon className="text-green-600" /> : <LinkIcon />}
          <span className="hidden md:inline">
            {copied ? t("invitations.share_copied") : t("invitations.share")}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {copied
          ? t("invitations.share_copied")
          : t("invitations.share_tooltip")}
      </TooltipContent>
    </Tooltip>
  )
}
