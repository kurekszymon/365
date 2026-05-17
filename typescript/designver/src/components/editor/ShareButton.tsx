import { useState } from 'react'
import { Link, Check } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    try {
      const url = `${window.location.origin}/editor${window.location.hash}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-sm"
            onClick={handleShare}
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Link size={14} />
            )}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy shareable link to clipboard</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
