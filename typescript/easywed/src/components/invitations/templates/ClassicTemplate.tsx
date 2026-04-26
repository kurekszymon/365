import { useTranslation } from "react-i18next"
import { salutationLine } from "./utils"
import type { TemplateProps } from "./types"
import type { InvitationTexts } from "@/stores/invitation.store"
import { COLOR_SCHEMES } from "@/lib/invitation/colorSchemes"

export function ClassicTemplate({
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
              fontStyle: "italic",
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: c.muted,
              marginBottom: "12px",
              textTransform: "uppercase",
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
              fontSize: "42px",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "8px",
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
              fontSize: "16px",
              letterSpacing: "0.08em",
              color: c.muted,
              marginTop: "8px",
            }}
          >
            {texts.date}
          </p>
        ) : null

      case "time":
        return texts.time ? (
          <p
            key="time"
            style={{
              fontSize: "14px",
              letterSpacing: "0.06em",
              color: c.muted,
              marginTop: "4px",
            }}
          >
            {texts.time}
          </p>
        ) : null

      case "venue":
        return texts.venue ? (
          <p
            key="venue"
            style={{ fontSize: "18px", fontWeight: 700, marginTop: "12px" }}
          >
            {texts.venue}
          </p>
        ) : null

      case "venueAddress":
        return texts.venueAddress ? (
          <p
            key="venueAddress"
            style={{ fontSize: "13px", color: c.muted, marginTop: "4px" }}
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
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: "16px",
            }}
          >
            {t("invitations.template.rsvp_by")} {texts.rsvpDeadline}
          </p>
        ) : null

      case "rsvpEmail":
        return texts.rsvpEmail ? (
          <p
            key="rsvpEmail"
            style={{ fontSize: "13px", color: c.accent, marginTop: "4px" }}
          >
            {texts.rsvpEmail}
          </p>
        ) : null

      case "guestSalutation":
        return greeting ? (
          <p
            key="guestSalutation"
            style={{
              marginTop: "16px",
              fontStyle: "italic",
              fontSize: "14px",
              color: guestName ? c.text : c.muted,
            }}
          >
            {greeting}
          </p>
        ) : null

      case "footer":
        return texts.footer ? (
          <p
            key="footer"
            style={{
              marginTop: "16px",
              fontSize: "12px",
              color: c.muted,
              fontStyle: "italic",
              textAlign: "center",
              maxWidth: "340px",
            }}
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
      className="invitation-card classic-template"
      style={{
        width: "585px",
        height: "830px",
        backgroundColor: c.bg,
        fontFamily: fontCss,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 64px",
        boxSizing: "border-box",
        position: "relative",
        pageBreakAfter: "always",
      }}
    >
      {/* Outer border */}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: `1px solid ${c.border}`,
          pointerEvents: "none",
        }}
      />
      {/* Inner border */}
      <div
        style={{
          position: "absolute",
          inset: "26px",
          border: `0.5px solid ${c.border}`,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Decorative top rule */}
        <div
          style={{
            width: "80px",
            height: "1px",
            backgroundColor: c.accent,
            marginBottom: "24px",
          }}
        />

        {sideFields.map((key) => renderField(key))}

        {/* Decorative bottom rule */}
        <div
          style={{
            width: "80px",
            height: "1px",
            backgroundColor: c.accent,
            marginTop: "28px",
          }}
        />
      </div>
    </div>
  )
}
