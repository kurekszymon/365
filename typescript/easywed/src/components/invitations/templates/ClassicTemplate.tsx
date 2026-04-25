import type { TemplateProps } from "./types"

const SCHEMES: Record<
  string,
  { bg: string; border: string; accent: string; text: string; muted: string }
> = {
  "cream-gold": {
    bg: "#fdf8f0",
    border: "#b8962e",
    accent: "#b8962e",
    text: "#2c1810",
    muted: "#7a6a5a",
  },
  sage: {
    bg: "#f4f7f2",
    border: "#5a7a5a",
    accent: "#3d5c3d",
    text: "#1a2e1a",
    muted: "#5a6a5a",
  },
  navy: {
    bg: "#f0f2f7",
    border: "#1a2d5a",
    accent: "#1a2d5a",
    text: "#0d1a35",
    muted: "#4a5a7a",
  },
}

// When guestName is provided (print-all), show the full salutation.
// When guestSalutation is set but no guestName (design preview), show a placeholder.
function salutationLine(salutation: string, guestName?: string): string | null {
  if (guestName) return `${salutation || "Drogi/a"} ${guestName}`
  if (salutation) return `${salutation} …`
  return null
}

export function ClassicTemplate({
  texts,
  colorScheme,
  fontCss,
  guestName,
}: TemplateProps) {
  const c = SCHEMES[colorScheme] ?? SCHEMES["cream-gold"]
  const greeting = salutationLine(texts.guestSalutation, guestName)

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

        {/* Headline */}
        {texts.headline && (
          <p
            style={{
              fontStyle: "italic",
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: c.muted,
              marginBottom: "20px",
              textTransform: "uppercase",
            }}
          >
            {texts.headline}
          </p>
        )}

        {/* Couple names */}
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "8px",
            color: c.text,
          }}
        >
          {texts.coupleNames || "Anna & Piotr"}
        </h1>

        {/* Date + time */}
        {(texts.date || texts.time) && (
          <p
            style={{
              fontSize: "16px",
              letterSpacing: "0.08em",
              color: c.muted,
              marginTop: "20px",
              marginBottom: "4px",
            }}
          >
            {[texts.date, texts.time].filter(Boolean).join("  ·  ")}
          </p>
        )}

        {/* Decorative divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "20px 0",
            width: "60%",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: c.border,
              opacity: 0.4,
            }}
          />
          <span style={{ color: c.accent, fontSize: "16px" }}>✦</span>
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: c.border,
              opacity: 0.4,
            }}
          />
        </div>

        {/* Venue */}
        {texts.venue && (
          <p style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
            {texts.venue}
          </p>
        )}
        {texts.venueAddress && (
          <p style={{ fontSize: "13px", color: c.muted }}>
            {texts.venueAddress}
          </p>
        )}

        {/* RSVP */}
        {(texts.rsvpEmail || texts.rsvpDeadline) && (
          <div style={{ marginTop: "28px", textAlign: "center" }}>
            {texts.rsvpDeadline && (
              <p
                style={{
                  fontSize: "12px",
                  color: c.muted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                RSVP do {texts.rsvpDeadline}
              </p>
            )}
            {texts.rsvpEmail && (
              <p
                style={{ fontSize: "13px", color: c.accent, marginTop: "2px" }}
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
              fontStyle: "italic",
              fontSize: "14px",
              color: guestName ? c.text : c.muted,
            }}
          >
            {greeting}
          </p>
        )}

        {/* Footer */}
        {texts.footer && (
          <p
            style={{
              marginTop: "20px",
              fontSize: "12px",
              color: c.muted,
              fontStyle: "italic",
              textAlign: "center",
              maxWidth: "340px",
            }}
          >
            {texts.footer}
          </p>
        )}

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
