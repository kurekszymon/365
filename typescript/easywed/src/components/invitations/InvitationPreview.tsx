import { createPortal, flushSync } from "react-dom"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PrinterIcon } from "lucide-react"
import { ClassicTemplate } from "./templates/ClassicTemplate"
import { ModernTemplate } from "./templates/ModernTemplate"
import { RomanticTemplate } from "./templates/RomanticTemplate"
import { ShareButton } from "./ShareButton"
import type {
  InvitationColorScheme,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import { Button } from "@/components/ui/button"
import { useInvitationStore } from "@/stores/invitation.store"
import { getFontCss } from "@/lib/invitation/fonts"

type TemplateComponent = React.ComponentType<{
  texts: InvitationTexts
  colorScheme: InvitationColorScheme
  fontCss: string
  guestName?: string
}>

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  romantic: RomanticTemplate,
} satisfies Record<InvitationTemplate, TemplateComponent>

export function InvitationPreview() {
  const { t } = useTranslation()
  const design = useInvitationStore((s) => s.design)
  const guests = design.guestNames.length > 0 ? design.guestNames : undefined
  const Component = TEMPLATE_MAP[design.template]
  const fontCss = getFontCss(design.fontId)

  // Screen-only: fall back to placeholder text so the preview always looks complete.
  // Print portal uses design.texts directly — only real content goes to paper.
  const previewTexts: InvitationTexts = {
    headline: design.texts.headline || t("invitations.gallery.preview_headline"),
    coupleNames: design.texts.coupleNames || t("invitations.gallery.preview_couple"),
    date: design.texts.date || t("invitations.gallery.preview_date"),
    time: design.texts.time || t("invitations.gallery.preview_time"),
    venue: design.texts.venue || t("invitations.gallery.preview_venue"),
    venueAddress: design.texts.venueAddress || t("invitations.gallery.preview_venue_address"),
    rsvpEmail: design.texts.rsvpEmail || t("invitations.gallery.preview_rsvp_email"),
    rsvpDeadline: design.texts.rsvpDeadline || t("invitations.gallery.preview_rsvp_deadline"),
    guestSalutation: design.texts.guestSalutation,
    footer: design.texts.footer,
  }

  const [printAll, setPrintAll] = useState(false)

  const handlePrintPreview = () => {
    flushSync(() => setPrintAll(false))
    window.print()
  }

  const handlePrintAll = () => {
    flushSync(() => setPrintAll(true))
    window.print()
  }

  const CARD_W = 585
  const CARD_H = 830
  const PREVIEW_W = 400
  const scale = PREVIEW_W / CARD_W
  const scaledH = CARD_H * scale

  return (
    <div className="flex flex-col gap-4">
      {/* Print target — portalled to body so print:hidden ancestors don't block it.
          printAll controls whether we render one card (preview) or all guest cards. */}
      {createPortal(
        <div data-print-view className="hidden">
          {printAll && guests && guests.length > 0 ? (
            guests.map((name, idx) => (
              <Component
                key={`${idx}-${name}`}
                texts={design.texts}
                colorScheme={design.colorScheme}
                fontCss={fontCss}
                guestName={name}
              />
            ))
          ) : (
            <Component
              texts={design.texts}
              colorScheme={design.colorScheme}
              fontCss={fontCss}
            />
          )}
        </div>,
        document.body
      )}

      {/* Screen preview — always single card, no guest name */}
      <div
        className="overflow-hidden rounded-lg border shadow-sm"
        style={{
          width: `${PREVIEW_W}px`,
          height: `${scaledH}px`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            pointerEvents: "none",
          }}
        >
          <Component
            texts={previewTexts}
            colorScheme={design.colorScheme}
            fontCss={fontCss}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <ShareButton />
        <Button variant="outline" onClick={handlePrintPreview}>
          <PrinterIcon />
          {t("invitations.print_preview")}
        </Button>
        {guests && guests.length > 0 && (
          <Button variant="outline" onClick={handlePrintAll}>
            <PrinterIcon />
            {t("invitations.print_all", { count: guests.length })}
          </Button>
        )}
      </div>
    </div>
  )
}
