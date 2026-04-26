import { useTranslation } from "react-i18next"
import { salutationLine } from "./utils"
import type { TemplateProps } from "./types"
import type { InvitationTexts } from "@/stores/invitation.store"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"

export function ModernTemplate({
  texts,
  colorScheme,
  fontCss,
  guestName,
  side,
  fieldSides,
  fieldOrder,
}: TemplateProps) {
  const { t } = useTranslation()
  const c = COLOR_SCHEMES[colorScheme]
  const greeting = salutationLine(texts.guestSalutation, guestName)

  const sideFields = fieldOrder.filter((k) => fieldSides[k] === side)

  function renderField(key: keyof InvitationTexts) {
    switch (key) {
      case "headline":
        return texts.headline ? (
          <p
            key="headline"
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: c.muted,
              marginBottom: "16px",
              fontWeight: 500,
            }}
          >
            {texts.headline}
          </p>
        ) : null

      case "coupleNames":
        return (
          <h1
            key="coupleNames"
            style={{
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              color: c.text,
            }}
          >
            {texts.coupleNames}
          </h1>
        )

      case "date":
        return texts.date ? (
          <p
            key="date"
            style={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: "4px",
            }}
          >
            {texts.date}
          </p>
        ) : null

      case "time":
        return texts.time ? (
          <p
            key="time"
            style={{ fontSize: "15px", color: c.muted, marginBottom: "16px" }}
          >
            {texts.time}
          </p>
        ) : null

      case "venue":
        return texts.venue ? (
          <p
            key="venue"
            style={{ fontSize: "15px", fontWeight: 600, marginBottom: "2px" }}
          >
            {texts.venue}
          </p>
        ) : null

      case "venueAddress":
        return texts.venueAddress ? (
          <p
            key="venueAddress"
            style={{ fontSize: "13px", color: c.muted, marginBottom: "16px" }}
          >
            {texts.venueAddress}
          </p>
        ) : null

      case "rsvpDeadline":
        return texts.rsvpDeadline ? (
          <p
            key="rsvpDeadline"
            style={{
              fontSize: "12px",
              color: c.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            {t("invitations.template.confirm_by")} {texts.rsvpDeadline}
          </p>
        ) : null

      case "rsvpEmail":
        return texts.rsvpEmail ? (
          <p
            key="rsvpEmail"
            style={{
              fontSize: "13px",
              color: c.accent,
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            {texts.rsvpEmail}
          </p>
        ) : null

      case "guestSalutation":
        return greeting ? (
          <p
            key="guestSalutation"
            style={{
              fontSize: "13px",
              color: guestName ? c.text : c.muted,
              fontStyle: "italic",
              marginBottom: "8px",
            }}
          >
            {greeting}
          </p>
        ) : null

      case "footer":
        return texts.footer ? (
          <p
            key="footer"
            style={{ fontSize: "12px", color: c.muted, marginBottom: "8px" }}
          >
            {texts.footer}
          </p>
        ) : null

      default:
        return null
    }
  }

  return (
    <div
      className="invitation-card modern-template"
      style={{
        width: "585px",
        height: "830px",
        backgroundColor: c.bg,
        fontFamily: fontCss,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px 80px",
        boxSizing: "border-box",
        pageBreakAfter: "always",
      }}
    >
      {/* Full-width top rule */}
      <div
        style={{
          height: "2px",
          backgroundColor: c.border,
          marginBottom: "32px",
        }}
      />

      {sideFields.map((key) => renderField(key))}

      {/* Full-width bottom rule */}
      <div
        style={{
          height: "1px",
          backgroundColor: c.border,
          opacity: 0.2,
          marginTop: "16px",
        }}
      />
    </div>
  )
}
