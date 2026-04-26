import { createPortal, flushSync } from "react-dom"
import { Fragment, useState } from "react"
import { useTranslation } from "react-i18next"
import { PrinterIcon } from "lucide-react"
import { ClassicTemplate } from "./templates/ClassicTemplate"
import { ModernTemplate } from "./templates/ModernTemplate"
import { RomanticTemplate } from "./templates/RomanticTemplate"
import { ShareButton } from "./ShareButton"
import type {
  InvitationColorScheme,
  InvitationSide,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import { Button } from "@/components/ui/button"
import { useInvitationStore } from "@/stores/invitation.store"
import { getFontCss } from "@/lib/invitation/fonts"
import { cn } from "@/lib/utils"

type TemplateComponent = React.ComponentType<{
  texts: InvitationTexts
  colorScheme: InvitationColorScheme
  fontCss: string
  guestName?: string
  side: InvitationSide
  fieldSides: Record<keyof InvitationTexts, InvitationSide>
  fieldOrder: Array<keyof InvitationTexts>
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

  const [previewSide, setPreviewSide] = useState<InvitationSide>("front")

  // Screen-only: fall back to placeholder text so the preview always looks complete.
  // Print portal uses design.texts directly — only real content goes to paper.
  const previewTexts: InvitationTexts = {
    headline:
      design.texts.headline || t("invitations.gallery.preview_headline"),
    coupleNames:
      design.texts.coupleNames || t("invitations.gallery.preview_couple"),
    date: design.texts.date || t("invitations.gallery.preview_date"),
    time: design.texts.time || t("invitations.gallery.preview_time"),
    venue: design.texts.venue || t("invitations.gallery.preview_venue"),
    venueAddress:
      design.texts.venueAddress ||
      t("invitations.gallery.preview_venue_address"),
    rsvpEmail:
      design.texts.rsvpEmail || t("invitations.gallery.preview_rsvp_email"),
    rsvpDeadline:
      design.texts.rsvpDeadline ||
      t("invitations.gallery.preview_rsvp_deadline"),
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

  const sharedProps = {
    colorScheme: design.colorScheme,
    fontCss,
    fieldSides: design.fieldSides,
    fieldOrder: design.fieldOrder,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Print target — portalled to body so print:hidden ancestors don't block it. */}
      {createPortal(
        <div data-print-view className="hidden">
          {printAll && guests && guests.length > 0 ? (
            guests.map((name, idx) => (
              <Fragment key={`${idx}-${name}`}>
                <Component
                  texts={design.texts}
                  guestName={name}
                  side="front"
                  {...sharedProps}
                />
                <Component
                  texts={design.texts}
                  guestName={name}
                  side="back"
                  {...sharedProps}
                />
              </Fragment>
            ))
          ) : (
            <>
              <Component texts={design.texts} side="front" {...sharedProps} />
              <Component texts={design.texts} side="back" {...sharedProps} />
            </>
          )}
        </div>,
        document.body
      )}

      {/* Screen preview — card with side toggle overlaid at top-left */}
      <div
        className="relative overflow-hidden rounded-lg border shadow-sm"
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
          <Component texts={previewTexts} side={previewSide} {...sharedProps} />
        </div>

        {/* Awers / Rewers toggle — absolute top-left, no vertical space */}
        <div className="absolute top-2 left-2 flex overflow-hidden rounded-md border border-white/20 shadow-md">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPreviewSide(s)}
              className={cn(
                "px-3 py-1 text-xs font-semibold transition-colors",
                previewSide === s
                  ? "bg-black/60 text-white"
                  : "bg-black/20 text-white/70 hover:bg-black/40 hover:text-white"
              )}
            >
              {s === "front" ? t("invitations.awers") : t("invitations.rewers")}
            </button>
          ))}
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
