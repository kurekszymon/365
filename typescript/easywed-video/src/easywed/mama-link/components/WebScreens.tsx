import React from "react";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { PHONE } from "./PhoneFrame";

/**
 * What mum's phone shows once she taps the link. It is the website in her
 * browser, not an app - so a plain address bar sits over every page, reading
 * the one address the film also closes on.
 */
export const BROWSER_BAR = 50;
/** Where a page's own layout starts, below the camera strip and the address bar. */
export const PAGE_TOP = PHONE.safeTop + BROWSER_BAR;

export const BrowserBar: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: PAGE_TOP,
      boxSizing: "border-box",
      paddingTop: PHONE.safeTop,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderBottom: `1px solid ${colors.border}`,
    }}
  >
    <div
      style={{
        width: PHONE.width - 32,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.bgDeep,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.sans,
        fontSize: 15,
        fontWeight: 500,
        color: colors.ink,
      }}
    >
      easywed.app
    </div>
  </div>
);

/**
 * The Google sign-in button (`GoogleSignInButton`, Google's own `gsi-material-button`):
 * white, a hairline border, the four-colour G and the label.
 */
const GoogleButton: React.FC<{ pressed: boolean }> = ({ pressed }) => (
  <div
    style={{
      height: 40,
      padding: "0 14px",
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      borderRadius: 4,
      border: "1px solid #747775",
      backgroundColor: pressed ? "#eef0f1" : "#ffffff",
      fontFamily: fonts.sans,
      fontSize: 14,
      fontWeight: 500,
      color: "#1f1f1f",
    }}
  >
    <svg width={20} height={20} viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
    {tl.app.auth.google}
  </div>
);

/** A form row in the card: `Label` over `Input`, `gap-1.5`. */
const Field: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: "14px", color: colors.ink }}>{label}</div>
    <div style={{ height: 32, borderRadius: 8, border: `1px solid ${colors.border}` }} />
    {children}
  </div>
);

/**
 * `/login` at easywed/v1, where `requireAuth` on `/invite/$token` sends
 * someone who is not signed in: the card with the wordmark and subtitle, the
 * Google button, *lub*, email and password, and the sign-up line under it.
 */
export const SignInScreen: React.FC<{ googlePressed: boolean }> = ({ googlePressed }) => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: colors.bg, fontFamily: fonts.sans, color: colors.ink }}>
    <BrowserBar />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: PAGE_TOP,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 24,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bg,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>easywed.</div>
          <div style={{ fontSize: 14, lineHeight: "20px", color: colors.inkSoft }}>{tl.app.auth.subtitle}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleButton pressed={googlePressed} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: colors.inkSoft }}>
          <div style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
          <span style={{ textTransform: "uppercase" }}>{tl.app.auth.or}</span>
          <div style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label={tl.app.auth.email} />
          <Field label={tl.app.auth.password}>
            <div style={{ alignSelf: "flex-end", fontSize: 12, color: colors.inkSoft, textDecoration: "underline" }}>
              {tl.app.auth.forgot}
            </div>
          </Field>
          {/* Disabled until both fields hold something. */}
          <div
            style={{
              height: 32,
              borderRadius: 8,
              backgroundColor: colors.primary,
              color: colors.primaryInk,
              opacity: 0.5,
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {tl.app.auth.signIn}
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 14, color: colors.inkSoft }}>
          {tl.app.auth.noAccount} <span style={{ textDecoration: "underline" }}>{tl.app.auth.signUp}</span>
        </div>
      </div>
    </div>
  </div>
);

/** Where the Google button's centre sits on the sign-in page, in the phone's CSS px - for the thumb. */
export const GOOGLE_BUTTON_AT = (() => {
  // The card is centred in the page: its height is the sum of its rows and `gap-5`s.
  const rows = [28 + 4 + 20, 40, 16, 14 + 6 + 32 + 12 + 14 + 6 + 32 + 6 + 16 + 12 + 32, 20];
  const card = rows.reduce((sum, h) => sum + h, 0) + 20 * (rows.length - 1) + 24 * 2 + 2;
  const top = PAGE_TOP + (PHONE.height - PAGE_TOP - card) / 2;
  return { x: PHONE.width / 2, y: top + 1 + 24 + rows[0] + 20 + 20 };
})();

/** `/invite/$token` while `claim_wedding_invitation` runs: one muted line, centred. */
export const ClaimingScreen: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: colors.bg }}>
    <BrowserBar />
    <div
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        top: PAGE_TOP,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.sans,
        fontSize: 14,
        color: colors.inkSoft,
      }}
    >
      {tl.app.inviteClaiming}
    </div>
  </div>
);
