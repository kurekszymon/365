import { useTranslation } from "react-i18next"
import { TemplateGallery } from "./TemplateGallery"
import { QuantityPicker } from "./QuantityPicker"
import { useInvitationStore } from "@/stores/invitation.store"
import { COLOR_SCHEME_LABELS, TEMPLATES } from "@/lib/invitation/templates"
import { FONT_OPTIONS } from "@/lib/invitation/fonts"
import { Input } from "@/components/ui/input"

interface DesignEditorProps {
  guestCount?: number
}

export function DesignEditor({ guestCount }: DesignEditorProps) {
  const { t } = useTranslation()
  const design = useInvitationStore((s) => s.design)
  const updateTexts = useInvitationStore((s) => s.updateTexts)
  const updateDesign = useInvitationStore((s) => s.updateDesign)

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
    <div className="flex flex-col gap-6 pb-8">
      {/* Template picker */}
      <TemplateGallery />

      {/* Content section */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{t("invitations.step_text")}</p>
        {textField(
          "headline",
          "invitations.text_headline",
          t("invitations.text_headline_placeholder")
        )}
        {textField("coupleNames", "invitations.text_couple_names", "Anna & Piotr")}
        <div className="grid grid-cols-2 gap-3">
          {textField("date", "invitations.text_date", "14 czerwca 2026")}
          {textField("time", "invitations.text_time", "15:00")}
        </div>
        {textField("venue", "invitations.text_venue", "Pałac Krasiczyn")}
        {textField("venueAddress", "invitations.text_venue_address", "Krasiczyn 179")}
        {textField("rsvpEmail", "invitations.text_rsvp_email", "rsvp@wesele.pl")}
        {textField("rsvpDeadline", "invitations.text_rsvp_deadline", "1 maja 2026")}
        {textField("footer", "invitations.text_footer", "")}
      </section>

      {/* Style section */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{t("invitations.step_style")}</p>

        {/* Font picker */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{t("invitations.font")}</p>
          <div className="flex flex-col gap-1.5">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.id}
                onClick={() => updateDesign({ fontId: font.id })}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-all ${
                  design.fontId === font.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span
                  className="text-lg leading-none"
                  style={{ fontFamily: font.css }}
                >
                  Aa
                </span>
                <span className="text-sm">{font.label}</span>
                <span
                  className="text-muted-foreground ml-auto text-xs"
                  style={{ fontFamily: font.css }}
                >
                  Ąę Óśź
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color scheme picker */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{t("invitations.color_scheme")}</p>
          <div className="flex flex-wrap gap-2">
            {currentTemplate?.colorSchemes.map((scheme) => (
              <button
                key={scheme}
                onClick={() => updateDesign({ colorScheme: scheme })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  design.colorScheme === scheme
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {COLOR_SCHEME_LABELS[scheme]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Quantity section */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{t("invitations.step_quantity")}</p>
        <QuantityPicker guestCount={guestCount} />
      </section>
    </div>
  )
}
