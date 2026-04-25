import { useState } from "react"
import { CheckIcon, LinkIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ShareButton() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the URL
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
        {copied ? t("invitations.share_copied") : t("invitations.share_tooltip")}
      </TooltipContent>
    </Tooltip>
  )
}
