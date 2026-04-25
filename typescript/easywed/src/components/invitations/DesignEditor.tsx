import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDownIcon } from "lucide-react"
import { TemplateGallery } from "./TemplateGallery"
import { QuantityPicker } from "./QuantityPicker"
import { useInvitationStore } from "@/stores/invitation.store"
import { COLOR_SCHEME_LABELS, TEMPLATES } from "@/lib/invitation/templates"
import { FONT_OPTIONS } from "@/lib/invitation/fonts"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DesignEditorProps {
  guestCount?: number
}

export function DesignEditor({ guestCount }: DesignEditorProps) {
  const { t } = useTranslation()
  const design = useInvitationStore((s) => s.design)
  const updateTexts = useInvitationStore((s) => s.updateTexts)
  const updateDesign = useInvitationStore((s) => s.updateDesign)
  const [styleOpen, setStyleOpen] = useState(true)

  const currentTemplate = TEMPLATES.find((tmpl) => tmpl.id === design.template)

  const textField = (
    key: keyof typeof design.texts,
    labelKey: string,
    placeholder = ""
  ) => (
    <div className="flex flex-col gap-1.5" key={key}>
      <label className="text-sm font-medium" htmlFor={`inv-${key}`}>
        {t(labelKey)}
      </label>
      <Input
        id={`inv-${key}`}
        value={design.texts[key]}
        placeholder={placeholder}
        onChange={(e) => updateTexts({ [key]: e.target.value })}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Collapsible: Template & Style ── */}
      <section className="flex flex-col gap-3">
        <button
          className="flex w-full items-center justify-between"
          onClick={() => setStyleOpen((v) => !v)}
        >
          <p className="text-sm font-semibold">
            {t("invitations.step_style_template")}
          </p>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              styleOpen && "rotate-180"
            )}
          />
        </button>

        {styleOpen && (
          <div className="flex flex-col gap-4">
            {/* Template thumbnails */}
            <TemplateGallery />

            <Separator />

            {/* Font picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="inv-font">
                {t("invitations.font")}
              </label>
              <Select
                value={design.fontId}
                onValueChange={(id) => updateDesign({ fontId: id })}
              >
                <SelectTrigger id="inv-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      <span style={{ fontFamily: font.css }}>{font.label}</span>
                      <span
                        className="ml-2 text-xs text-muted-foreground"
                        style={{ fontFamily: font.css }}
                      >
                        Ąę Óśź
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color scheme */}
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">
                {t("invitations.color_scheme")}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTemplate?.colorSchemes.map((scheme) => (
                  <button
                    key={scheme}
                    onClick={() => updateDesign({ colorScheme: scheme })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      design.colorScheme === scheme
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    {COLOR_SCHEME_LABELS[scheme]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <Separator />

      {/* ── Content ── */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{t("invitations.step_text")}</p>
        {textField(
          "headline",
          "invitations.text_headline",
          t("invitations.text_headline_placeholder")
        )}
        {textField(
          "coupleNames",
          "invitations.text_couple_names",
          "Anna & Piotr"
        )}
        <div className="grid grid-cols-2 gap-3">
          {textField("date", "invitations.text_date", "14 czerwca 2026")}
          {textField("time", "invitations.text_time", "15:00")}
        </div>
        {textField("venue", "invitations.text_venue", "Pałac Krasiczyn")}
        {textField(
          "venueAddress",
          "invitations.text_venue_address",
          "Krasiczyn 179"
        )}
        {textField(
          "rsvpEmail",
          "invitations.text_rsvp_email",
          "rsvp@wesele.pl"
        )}
        {textField(
          "rsvpDeadline",
          "invitations.text_rsvp_deadline",
          "1 maja 2026"
        )}

        {/* Guest salutation — personalisation slot */}
        <div className="flex flex-col gap-1.5">
          {textField(
            "guestSalutation",
            "invitations.text_guest_salutation",
            "Drogi/a"
          )}
          <p className="text-xs text-muted-foreground">
            {t("invitations.text_guest_salutation_hint")}
          </p>
        </div>

        {textField("footer", "invitations.text_footer", "")}
      </section>

      <Separator />

      {/* ── Quantity & Order ── */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">
          {t("invitations.step_quantity")}
        </p>
        <QuantityPicker guestCount={guestCount} />
      </section>
    </div>
  )
}
