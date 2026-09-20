import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { GuestPanel, panelGeometry, scrollTo } from "../components/GuestPanel";
import { guestListFor, rowOf, TAGGED_ON_CAMERA } from "../guests";

/**
 * The guest panel as the couple left it: 58 names, every one of them an adult
 * as far as the list knows, and not a badge among them. The list drifts under
 * the question the way a thumb scrolls it.
 */
const LINE = tl.kids.hook;

/** Word stagger - the last word has settled by frame 37, inside the 1.5 s hook. */
const WORD_FROM = 2;
const WORD_STEP = 5;
const WORD_OVER = 20;

/** The list drifts to where the next scene picks it up, and holds from frame 74. */
const DRIFT_TO = 74;
/** How far above its landing place the list starts, in CSS px. */
const DRIFT = 190;

/** Where the row the next scene edits comes to rest, in CSS px below the list's top. */
export const ROW_OFFSET = 150;

/**
 * `scrim` is how far down the list fades out under the question. It is drawn
 * over the list's own column (`fadeWidth`), not the whole frame: in landscape
 * the planner sits beside it, and a half-faded hall reads as a fault.
 */
const LAYOUT = {
  wide: { padTop: 92, padX: 120, fontSize: 88, scrim: 440 },
  tall: { padTop: 168, padX: 64, fontSize: 96, scrim: 760 },
};

export const KidsHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const guests = guestListFor(hall);
  const { fadeWidth } = panelGeometry(tall, frameWidth, frameHeight);

  const landing = scrollTo(guests, rowOf(guests, TAGGED_ON_CAMERA[0].name), ROW_OFFSET);
  const scroll = interpolate(frame, [0, DRIFT_TO], [Math.max(0, landing - DRIFT), landing], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const words = LINE.map((_, i) =>
    spring({ frame: frame - (WORD_FROM + i * WORD_STEP), fps, config: { damping: 200 }, durationInFrames: WORD_OVER }),
  );

  return (
    <GuestPanel guests={guests} scroll={scroll} aged={guests.map(() => 0)}>
      {/* The question sits on clean ground: the list fades out under it. */}
      <AbsoluteFill
        style={{
          width: fadeWidth,
          height: layout.scrim,
          background: `linear-gradient(${colors.bg} 72%, rgba(244, 241, 233, 0))`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          padding: `${layout.padTop}px ${layout.padX}px 0`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: tall ? 22 : 26,
            rowGap: tall ? 4 : 8,
            fontFamily: fonts.heading,
            fontSize: layout.fontSize,
            fontWeight: 600,
            letterSpacing: -2.5,
            lineHeight: 1.1,
            color: colors.ink,
            textAlign: "center",
          }}
        >
          {LINE.map((word, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: words[i],
                transform: `translateY(${interpolate(words[i], [0, 1], [34, 0])}px)`,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </GuestPanel>
  );
};
