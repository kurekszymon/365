import type { TemplateProps } from "./types"

const SCHEMES: Record<
  string,
  { bg: string; text: string; accent: string; muted: string; rule: string }
> = {
  "pure-white": {
    bg: "#ffffff",
    text: "#1a1a1a",
    accent: "#1a1a1a",
    muted: "#888888",
    rule: "#1a1a1a",
  },
  slate: {
    bg: "#f5f6f7",
    text: "#2d3748",
    accent: "#2d3748",
    muted: "#718096",
    rule: "#4a5568",
  },
  midnight: {
    bg: "#0f1117",
    text: "#f0f0f0",
    accent: "#e8d5b7",
    muted: "#a0a0a0",
    rule: "#444444",
  },
}

function salutationLine(salutation: string, guestName?: string): string | null {
  if (guestName) return `${salutation || "Drogi/a"} ${guestName}`
  if (salutation) return `${salutation} …`
  return null
}

export function ModernTemplate({
  texts,
  colorScheme,
  fontCss,
  guestName,
}: TemplateProps) {
  const c = SCHEMES[colorScheme] ?? SCHEMES["pure-white"]
  const greeting = salutationLine(texts.guestSalutation, guestName)

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
      {/* Headline */}
      {texts.headline && (
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c.muted,
            marginBottom: "24px",
            fontWeight: 500,
          }}
        >
          {texts.headline}
        </p>
      )}

      {/* Full-width rule */}
      <div
        style={{ height: "2px", backgroundColor: c.rule, marginBottom: "32px" }}
      />

      {/* Couple names */}
      <h1
        style={{
          fontSize: "52px",
          fontWeight: 700,
          lineHeight: 1.0,
          letterSpacing: "-0.02em",
          marginBottom: "32px",
          color: c.text,
        }}
      >
        {texts.coupleNames || "Anna & Piotr"}
      </h1>

      {/* Full-width rule */}
      <div
        style={{
          height: "1px",
          backgroundColor: c.rule,
          opacity: 0.2,
          marginBottom: "32px",
        }}
      />

      {/* Date + time */}
      {(texts.date || texts.time) && (
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {texts.date}
          </p>
          {texts.time && (
            <p style={{ fontSize: "15px", color: c.muted, marginTop: "4px" }}>
              {texts.time}
            </p>
          )}
        </div>
      )}

      {/* Venue */}
      {texts.venue && (
        <div style={{ marginBottom: "4px" }}>
          <p style={{ fontSize: "15px", fontWeight: 600 }}>{texts.venue}</p>
          {texts.venueAddress && (
            <p style={{ fontSize: "13px", color: c.muted, marginTop: "2px" }}>
              {texts.venueAddress}
            </p>
          )}
        </div>
      )}

      {/* RSVP */}
      {(texts.rsvpEmail || texts.rsvpDeadline) && (
        <div style={{ marginTop: "32px" }}>
          <div
            style={{
              height: "1px",
              backgroundColor: c.rule,
              opacity: 0.15,
              marginBottom: "16px",
            }}
          />
          {texts.rsvpDeadline && (
            <p
              style={{
                fontSize: "12px",
                color: c.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Potwierdzenie do {texts.rsvpDeadline}
            </p>
          )}
          {texts.rsvpEmail && (
            <p
              style={{
                fontSize: "13px",
                color: c.accent,
                marginTop: "4px",
                fontWeight: 500,
              }}
            >
              {texts.rsvpEmail}
            </p>
          )}
        </div>
      )}

      {/* Guest salutation — muted placeholder in preview, full colour at print time */}
      {greeting && (
        <p
          style={{
            marginTop: "28px",
            fontSize: "13px",
            color: guestName ? c.text : c.muted,
            fontStyle: "italic",
          }}
        >
          {greeting}
        </p>
      )}

      {/* Footer */}
      {texts.footer && (
        <p style={{ marginTop: "20px", fontSize: "12px", color: c.muted }}>
          {texts.footer}
        </p>
      )}
    </div>
  )
}
