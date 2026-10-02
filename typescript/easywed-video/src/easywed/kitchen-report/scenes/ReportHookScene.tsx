import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts, shadow } from "../../theme";

/**
 * The questions arriving one message after another - the venue, the florist,
 * the kitchen - each answered by the report the rest of the film prints. The
 * kitchen comes last, since the next scene answers it with the diet tags.
 *
 * Every message is revealed word by word. A unit holding more than one word
 * keeps a lone "o" off the end of a line and never strands "wege." on its own.
 */
const MESSAGES = tl.report.messages;

/** Word stagger inside a message - the first has settled by frame 28, inside the 1.5 s hook. */
const WORD_FROM = 4;
const WORD_STEP = 4;
const WORD_OVER = 16;

/** Frames between one message settling and the next popping in. */
const MESSAGE_GAP = 10;

/** When each message pops in: 0, 38 and 84, so the last has settled by frame 116. */
const messageFrom = MESSAGES.reduce<number[]>(
  (starts, words, m) => {
    if (m === MESSAGES.length - 1) return starts;
    const settled =
      starts[m] + WORD_FROM + (words.length - 1) * WORD_STEP + WORD_OVER;
    return [...starts, settled + MESSAGE_GAP];
  },
  [0],
);

/** Once the last message has been read, someone is typing again. */
const TYPING_FROM = 130;

const LAYOUT = {
  wide: {
    width: 1560,
    fontSize: 76,
    padX: 44,
    padY: 26,
    radius: 44,
    columnGap: 18,
    gap: 22,
  },
  tall: {
    width: 960,
    fontSize: 78,
    padX: 44,
    padY: 32,
    radius: 44,
    columnGap: 18,
    gap: 26,
  },
};

export const ReportHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;

  const typingIn = spring({
    frame: frame - TYPING_FROM,
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });

  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: layout.width,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: layout.gap,
          }}
        >
          {MESSAGES.map((words, m) => {
            const from = messageFrom[m];
            const bubbleIn = spring({
              frame: frame - from,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              // An incoming message: flat corner bottom-left, where the tail would be.
              <div
                key={m}
                style={{
                  padding: `${layout.padY}px ${layout.padX}px`,
                  borderRadius: `${layout.radius}px ${layout.radius}px ${layout.radius}px 12px`,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  boxShadow: shadow.card,
                  opacity: interpolate(bubbleIn, [0, 0.5], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                  transform: `translateY(${interpolate(bubbleIn, [0, 1], [50, 0])}px) scale(${interpolate(bubbleIn, [0, 1], [0.9, 1])})`,
                  transformOrigin: "left bottom",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    columnGap: layout.columnGap,
                    rowGap: 2,
                    fontFamily: fonts.heading,
                    fontSize: layout.fontSize,
                    fontWeight: 600,
                    letterSpacing: -1.8,
                    lineHeight: 1.1,
                    color: colors.ink,
                  }}
                >
                  {words.map((word, i) => {
                    const wordIn = spring({
                      frame: frame - (from + WORD_FROM + i * WORD_STEP),
                      fps,
                      config: { damping: 200 },
                      durationInFrames: WORD_OVER,
                    });
                    return (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          opacity: wordIn,
                          transform: `translateY(${interpolate(wordIn, [0, 1], [24, 0])}px)`,
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "22px 30px",
              borderRadius: `999px 999px 999px 12px`,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              opacity: typingIn,
              transform: `translateY(${interpolate(typingIn, [0, 1], [20, 0])}px)`,
            }}
          >
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: colors.inkSoft,
                  // Each dot lifts in turn, as a typing indicator does.
                  opacity:
                    0.45 +
                    0.55 *
                      Math.max(
                        0,
                        Math.sin((frame - TYPING_FROM) * 0.3 - dot * 0.9),
                      ),
                  transform: `translateY(${-6 * Math.max(0, Math.sin((frame - TYPING_FROM) * 0.3 - dot * 0.9))}px)`,
                }}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
