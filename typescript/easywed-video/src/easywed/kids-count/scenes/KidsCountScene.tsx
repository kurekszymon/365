import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CHIPS_TOP, isKid } from "../../components/GuestList";
import { Cursor } from "../../components/Cursor";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { GuestPanel, panelGeometry, scrollTo } from "../components/GuestPanel";
import { guestListFor, rowOf, TAGGED_ON_CAMERA } from "../guests";
import { ROW_OFFSET } from "./KidsHookScene";

/**
 * The other three were tagged between the cuts, so the chip has counted them:
 * pressing it filters the list to the children, each with the bracket the
 * couple gave them. The number is read off the list, never typed - it is
 * `countKids` over whatever brackets the rows carry.
 */

/**
 * The cursor crosses to the chip and presses it; the list filters on the press.
 * It arrives after the cut has finished, so the crossfade never carries half a
 * cursor over the beat before it.
 */
const CURSOR_IN = [8, 14] as const;
const REACH = [10, 26] as const;
const PRESS = 28;
const PRESS_HELD = 5;

/** The payoff lands once the filtered rows have settled. */
const PAYOFF_FROM = 50;

/** Where the `Dzieci` chip sits in the filter row: after `Wszyscy` and `Bez miejsca`, in CSS px. */
const CHIP_X = 218;

/**
 * The payoff's place. Portrait sets it under the filtered rows; landscape has
 * no room there, so it takes the clear band above the hall canvas rather than
 * lying across the tables.
 */
const LAYOUT = {
  wide: { fontSize: 64, width: 980, padX: 90, top: 34 },
  tall: { fontSize: 82, width: 900, padX: 64, top: 0 },
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const KidsCountScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const guests = guestListFor(hall);
  const geometry = panelGeometry(tall, frameWidth, frameHeight);

  const filtered = frame >= PRESS;
  // Until the chip is pressed the list is where the last beat left it; the
  // filter puts the five of them at the top, as it does in the app.
  const scroll = filtered ? 0 : scrollTo(guests, rowOf(guests, TAGGED_ON_CAMERA[1].name), ROW_OFFSET);

  const reach = interpolate(frame, REACH, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const chipX = geometry.listLeft + CHIP_X * geometry.scale;
  const chipY = geometry.listTop + (CHIPS_TOP + 15) * geometry.scale;
  const away = 1 - reach;
  const cursorShown =
    interpolate(frame, CURSOR_IN, [0, 1], clamp) * interpolate(frame, [PRESS + 14, PRESS + 26], [1, 0], clamp);

  const payoffIn = spring({
    frame: frame - PAYOFF_FROM,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });

  // Where the filtered rows end, so the payoff lands under them rather than on them.
  const rowsBottom =
    geometry.listTop +
    (78 * guests.filter((guest) => isKid(guest.ageGroup)).length + 160) * geometry.scale;

  return (
    <GuestPanel
      guests={guests}
      scroll={scroll}
      aged={guests.map(() => 1)}
      activeFilter={filtered ? "kids" : "all"}
    >
      <div
        style={{
          position: "absolute",
          left: chipX,
          top: chipY,
          opacity: cursorShown,
          transform: `translate(${120 * geometry.scale * away}px, ${210 * geometry.scale * away}px)`,
        }}
      >
        <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g transform={`scale(${geometry.scale * 1.05})`}>
            <Cursor x={0} y={0} opacity={1} pressed={frame >= PRESS && frame < PRESS + PRESS_HELD} />
          </g>
        </svg>
      </div>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: tall ? rowsBottom : layout.top,
            left: tall ? 0 : undefined,
            right: tall ? 0 : layout.padX,
            maxWidth: layout.width,
            marginLeft: tall ? "auto" : undefined,
            marginRight: tall ? "auto" : undefined,
            padding: tall ? `0 ${layout.padX}px` : 0,
            textAlign: tall ? "center" : "right",
            fontFamily: fonts.heading,
            fontSize: layout.fontSize,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.08,
            color: colors.ink,
            opacity: payoffIn,
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: `translateY(${interpolate(payoffIn, [0, 1], [24, 0])}px)`,
            }}
          >
            {tl.kids.payoff}
          </span>
        </div>
      </AbsoluteFill>
    </GuestPanel>
  );
};
