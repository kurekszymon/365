import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { BrandMark } from "../../components/BrandMark";
import { CallToAction } from "../../components/CallToAction";
import { PRINT_PAGE, PrintPage, printPages } from "../../components/PrintSheet";
import { Wordmark } from "../../components/Wordmark";
import { useFormat } from "../../format";
import { colors, fonts } from "../../theme";
import { guestListFor } from "../guests";

/** The printed pages settle into a stack, then the mark, the line and the call to action land. */
const STACK_FROM = 0;
const MARK_FROM = 14;
const LINE_FROM = 26;
const CTA_FROM = 44;

/** Each page's offset and tilt in the settled stack, guest list on top. */
const STACK = [
  { x: -34, y: -26, rotate: -5 },
  { x: 22, y: -6, rotate: 3 },
  { x: 0, y: 18, rotate: -1 },
];

const LAYOUT = {
  wide: {
    pageWidth: 640,
    markSize: 104,
    wordSize: 92,
    lineSize: 76,
    lineWidth: 760,
  },
  tall: {
    pageWidth: 780,
    markSize: 104,
    wordSize: 92,
    lineSize: 84,
    lineWidth: 920,
  },
};

export const ReportCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const guests = guestListFor(hall);
  const pages = printPages(hall, guests).slice(0, 3);

  const settle = spring({
    frame: frame - STACK_FROM,
    fps,
    config: { damping: 15, mass: 0.7 },
  });
  const markIn = spring({
    frame: frame - MARK_FROM,
    fps,
    config: { damping: 13, mass: 0.6 },
  });
  // The mark's two seats fill as the report lands - the room it came from was full.
  const fillProgress = spring({
    frame: frame - (MARK_FROM + 10),
    fps,
    config: { damping: 11, mass: 0.5 },
  });
  const lineIn = spring({
    frame: frame - LINE_FROM,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });

  const pageScale = layout.pageWidth / PRINT_PAGE.width;
  const pageHeight = PRINT_PAGE.height * pageScale;

  const stack = (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: layout.pageWidth + 80,
        height: pageHeight + 70,
        transform: `scale(${interpolate(settle, [0, 1], [1.3, 1])})`,
      }}
    >
      {pages.map((page, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 40,
            top: 35,
            transform: `translate(${STACK[i].x * (2 - settle)}px, ${STACK[i].y * (2 - settle)}px) rotate(${STACK[i].rotate * settle}deg)`,
          }}
        >
          <PrintPage
            page={page}
            hall={hall}
            guests={guests}
            scale={pageScale}
          />
        </div>
      ))}
    </div>
  );

  const text = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          transform: `scale(${markIn})`,
        }}
      >
        <BrandMark
          size={layout.markSize}
          seatProgress={1}
          fillProgress={fillProgress}
        />
        <Wordmark size={layout.wordSize} />
      </div>

      <div
        style={{
          marginTop: tall ? 40 : 36,
          maxWidth: layout.lineWidth,
          fontFamily: fonts.heading,
          fontSize: layout.lineSize,
          fontWeight: 600,
          letterSpacing: -2,
          lineHeight: 1.08,
          color: colors.ink,
          opacity: lineIn,
          transform: `translateY(${interpolate(lineIn, [0, 1], [24, 0])}px)`,
        }}
      >
        {"Wydrukuj i podaj dalej."}
      </div>

      <CallToAction
        // The heading above is the payoff; this is the step before it, so the
        // two lines stop issuing the same command.
        action="Dodaj preferencje żywieniowe gości"
        from={CTA_FROM}
        actionSize={tall ? 44 : 36}
        urlSize={tall ? 42 : 38}
        marginTop={tall ? 48 : 40}
      />
    </div>
  );

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: tall ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: tall ? 70 : 90,
          padding: tall ? "0 60px" : "0 100px",
        }}
      >
        {stack}
        {text}
      </AbsoluteFill>
    </Backdrop>
  );
};
