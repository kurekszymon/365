import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { useFormat } from "../../format";
import { colors, fonts } from "../../theme";
import { FileChip, Spreadsheet } from "../components/Spreadsheet";
import { FILE_NAME, SHEET_HEADERS, sheetFor } from "../sheet";

/** Revealed word by word; "w" is bound to "Excelu." so the line never ends on it. */
const LINE = ["Twoja", "lista", "gości", "mieszka", "w Excelu."];

/** Word stagger - the last word has settled by frame 42, inside the 1.5 s hook. */
const WORD_FROM = 2;
const WORD_STEP = 5;
const WORD_OVER = 20;

/** The sheet rises under the line, then drifts up at this many px per frame. */
const SHEET_FROM = 4;
const SCROLL_SPEED = 1.5;

/** The file chip lands on the sheet's corner once the line has been read. */
const CHIP_FROM = 34;

const LAYOUT = {
  wide: { padTop: 96, padX: 160, fontSize: 108, sheetTop: 430, sheetWidth: 1320, scale: 1.3, rows: 13 },
  tall: { padTop: 170, padX: 70, fontSize: 98, sheetTop: 570, sheetWidth: 980, scale: 1.35, rows: 22 },
};

export const ImportHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const { rows } = sheetFor(hall);

  const words = LINE.map((_, i) =>
    spring({ frame: frame - (WORD_FROM + i * WORD_STEP), fps, config: { damping: 200 }, durationInFrames: WORD_OVER }),
  );
  const sheetIn = spring({ frame: frame - SHEET_FROM, fps, config: { damping: 200 }, durationInFrames: 30 });
  const chipIn = spring({ frame: frame - CHIP_FROM, fps, config: { damping: 13, mass: 0.6 } });
  const scroll = Math.max(0, frame - SHEET_FROM) * SCROLL_SPEED;

  return (
    <Backdrop>
      <div
        style={{
          position: "absolute",
          top: layout.sheetTop,
          left: "50%",
          opacity: sheetIn,
          transform: `translateX(-50%) translateY(${interpolate(sheetIn, [0, 1], [90, 0])}px) rotate(-1.5deg)`,
        }}
      >
        <Spreadsheet
          headers={SHEET_HEADERS}
          rows={rows}
          width={layout.sheetWidth}
          scale={layout.scale}
          scroll={scroll}
          visibleRows={layout.rows}
        />
        <div
          style={{
            position: "absolute",
            top: -34 * layout.scale,
            right: 36 * layout.scale,
            opacity: chipIn,
            transform: `rotate(4deg) scale(${interpolate(chipIn, [0, 1], [0.7, 1])})`,
          }}
        >
          <FileChip name={FILE_NAME} scale={layout.scale} />
        </div>
      </div>

      {/* A soft fade over the sheet's top edge keeps the line on clean ground. */}
      <AbsoluteFill
        style={{
          height: layout.sheetTop + 40,
          background: `linear-gradient(${colors.bg} 78%, rgba(244, 241, 233, 0))`,
          opacity: 0.9,
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
            columnGap: tall ? 22 : 28,
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
              key={word}
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
    </Backdrop>
  );
};
