import React from "react";
import { BrowserBar, PAGE_TOP, PHONE } from "../../../components/PhoneFrame";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";

/**
 * `LocaleLanding` at easywed/v1.1.2 on a phone, unscrolled: its sticky header,
 * then `LandingHero` in one column, left-aligned (`items-start`) - the
 * uppercase eyebrow, the title, the subtitle, the two `lg` buttons (their
 * labels no longer fit one row at a phone's width, so `flex-wrap` stacks them),
 * and the `local_hint`. The hero's loop video starts below the fold; only its
 * box's top edge shows. Sizes are the app's CSS pixels.
 */

/** `h-14` header, `px-6` on everything, the hero's `py-16` and `gap-6`. */
const HEADER = 56;
const PAD_X = 24;
const CONTENT_WIDTH = PHONE.width - PAD_X * 2;
const HERO_TOP = HEADER + 64;
const GAP = 24;

/**
 * Each block's height at 390 px: the `text-sm` eyebrow on one line; the
 * `text-4xl leading-tight` title balanced over four lines of 45 px; the
 * `text-lg` subtitle's 28 px lines; the two buttons stacked with `gap-3`.
 * The blocks are laid out at these heights, so the thumb's target is exact.
 */
const EYEBROW = 20;
const TITLE = { size: 36, line: 45, lines: 4 };
const SUBTITLE = { size: 18, line: 28, lines: 4 };
const BUTTON = { height: 40, gap: 12 };

const tops = (() => {
  const eyebrow = HERO_TOP;
  const title = eyebrow + EYEBROW + GAP;
  const subtitle = title + TITLE.line * TITLE.lines + GAP;
  const buttons = subtitle + SUBTITLE.line * SUBTITLE.lines + GAP;
  const hint = buttons + BUTTON.height * 2 + BUTTON.gap + GAP;
  return { eyebrow, title, subtitle, buttons, hint };
})();

/** `lg` outline button's measured label plus `px-6`, for where the thumb lands. */
const TRY_WIDTH = 214;

/** The centre of *Wypróbujcie bez konta* on the second row, in the phone screen's CSS px. */
export const TRY_BUTTON = {
  x: PAD_X + TRY_WIDTH / 2,
  y: PAGE_TOP + tops.buttons + BUTTON.height + BUTTON.gap + BUTTON.height / 2,
};


const Button: React.FC<{ filled: boolean; pressed: boolean; children: React.ReactNode }> = ({ filled, pressed, children }) => (
  <div
    style={{
      height: BUTTON.height,
      padding: "0 24px",
      boxSizing: "border-box",
      borderRadius: 8,
      border: filled ? "none" : `1px solid ${colors.border}`,
      backgroundColor: filled ? colors.primary : colors.bg,
      boxShadow: filled ? undefined : "0 1px 2px rgba(0, 0, 0, 0.05)",
      color: filled ? colors.primaryInk : colors.ink,
      fontSize: 14,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      transform: pressed ? "translateY(1px)" : undefined,
      filter: pressed ? "brightness(0.96)" : undefined,
    }}
  >
    {children}
  </div>
);

const Block: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: "absolute", left: PAD_X, width: CONTENT_WIDTH, top }}>{children}</div>
);

export const LandingScreen: React.FC<{ tryPressed: boolean }> = ({ tryPressed }) => {
  const l = tl.app.landing;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: colors.bg, fontFamily: fonts.sans, color: colors.ink }}>
      <BrowserBar />

      <div style={{ position: "absolute", left: 0, right: 0, top: PAGE_TOP, bottom: 0, overflow: "hidden" }}>
        <Block top={tops.eyebrow}>
          <div
            style={{
              height: EYEBROW,
              fontSize: 14,
              lineHeight: `${EYEBROW}px`,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: colors.primary,
              whiteSpace: "nowrap",
            }}
          >
            {l.eyebrow}
          </div>
        </Block>
        <Block top={tops.title}>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: TITLE.size,
              lineHeight: `${TITLE.line}px`,
              fontWeight: 600,
              textWrap: "balance",
            }}
          >
            {l.title}
          </div>
        </Block>
        <Block top={tops.subtitle}>
          <div style={{ fontSize: SUBTITLE.size, lineHeight: `${SUBTITLE.line}px`, color: colors.inkSoft }}>{l.subtitle}</div>
        </Block>
        <Block top={tops.buttons}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: BUTTON.gap }}>
            <Button filled pressed={false}>
              {l.start}
            </Button>
            <Button filled={false} pressed={tryPressed}>
              {l.tryLocal}
            </Button>
          </div>
        </Block>
        <Block top={tops.hint}>
          <div style={{ fontSize: 12, lineHeight: "16px", color: colors.inkSoft }}>{l.localHint}</div>
        </Block>
        {/* The hero's `gap-12`, then the top of `LandingLoop`'s `aspect-video rounded-2xl border` box, below the fold. */}
        <Block top={tops.hint + 32 + 48}>
          <div
            style={{
              height: (CONTENT_WIDTH * 9) / 16,
              boxSizing: "border-box",
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
            }}
          />
        </Block>

        {/* `sticky top-0 border-b bg-background/80 backdrop-blur`: the wordmark, PL / EN, and *Zaloguj się*. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: HEADER,
            boxSizing: "border-box",
            padding: `0 ${PAD_X}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: `${colors.bg}cc`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 600 }}>easywed.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 500 }}>
              <span>PL</span>
              <span style={{ color: colors.inkSoft, opacity: 0.5 }}>/</span>
              <span style={{ color: colors.inkSoft }}>EN</span>
            </div>
            <div
              style={{
                height: 32,
                padding: "0 12px",
                boxSizing: "border-box",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {tl.app.auth.signIn}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
