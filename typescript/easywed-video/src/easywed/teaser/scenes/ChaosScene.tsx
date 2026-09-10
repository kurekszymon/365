import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { useFormat } from "../../format";
import { colors, fonts } from "../../theme";
import { SheetCard, StickyNote } from "../components/Scraps";

const SHEETS = [
  {
    filename: "goscie.xlsx",
    rows: [{ width: 52 }, { width: 44, struck: true }, { width: 58 }, { width: 40 }, { width: 49 }],
  },
  {
    filename: "goscie_final.xlsx",
    rows: [{ width: 46 }, { width: 55 }, { width: 38, struck: true }, { width: 51 }, { width: 43 }],
  },
  {
    filename: "goscie_final_OSTATECZNA.xlsx",
    rows: [{ width: 57 }, { width: 41 }, { width: 48 }, { width: 53, struck: true }, { width: 45 }],
  },
];

const NOTES = ["Ciocia Basia NIE obok Marka", "Wujek Janusz - bez glutenu?"];

/**
 * Where each scrap sits relative to the centre and which way it is flung. The
 * two cuts get their own arrangement: landscape spreads them across the frame,
 * portrait stacks them down it.
 */
type Placement = { x: number; y: number; rotate: number; fly: { x: number; y: number } };

const LAYOUT: Record<"wide" | "tall", { sheets: Placement[]; notes: Placement[] }> = {
  wide: {
    sheets: [
      { x: -430, y: -70, rotate: -7, fly: { x: -1, y: -0.45 } },
      { x: 40, y: -180, rotate: 5, fly: { x: 0.35, y: -1 } },
      { x: -40, y: 150, rotate: -3, fly: { x: 0.2, y: 1 } },
    ],
    notes: [
      { x: 480, y: 40, rotate: 9, fly: { x: 1, y: -0.3 } },
      { x: -540, y: 240, rotate: -12, fly: { x: -1, y: 0.7 } },
    ],
  },
  tall: {
    sheets: [
      { x: -110, y: -430, rotate: -6, fly: { x: -0.7, y: -1 } },
      { x: 100, y: -110, rotate: 5, fly: { x: 1, y: -0.4 } },
      { x: -80, y: 220, rotate: -4, fly: { x: -0.9, y: 0.6 } },
    ],
    notes: [
      { x: 250, y: 470, rotate: 10, fly: { x: 1, y: 0.8 } },
      { x: -250, y: -650, rotate: -11, fly: { x: -1, y: -0.8 } },
    ],
  },
};

export const ChaosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const scale = tall ? 1.15 : 1.25;
  const sheetWidth = tall ? 500 : 520;
  const noteWidth = tall ? 260 : 280;

  // The pile builds, starts to shake, then is swept off the screen.
  const jitter = interpolate(frame, [20, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sweep = interpolate(frame, [72, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const captionIn = spring({ frame: frame - 14, fps, config: { damping: 200 }, durationInFrames: 24 });

  const scrap = (place: Placement, index: number, enter: number, child: React.ReactNode) => {
    // Each scrap wobbles on its own phase, so the pile never moves as one block.
    const phase = index * 9;
    const wobble = Math.sin((frame + phase) * 0.55) * 7 * jitter;
    const tilt = Math.sin((frame + phase) * 0.42) * 2.6 * jitter;
    const flung = sweep * (tall ? 1500 : 1700);

    return (
      <div
        key={index}
        style={{
          position: "absolute",
          opacity: enter * (1 - sweep),
          transform: [
            `translate(${place.x + wobble + place.fly.x * flung}px, ${
              place.y + wobble * 0.6 + place.fly.y * flung
            }px)`,
            `rotate(${place.rotate + tilt + sweep * place.fly.x * 40}deg)`,
            `scale(${interpolate(enter, [0, 1], [0.86, 1])})`,
          ].join(" "),
        }}
      >
        {child}
      </div>
    );
  };

  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {SHEETS.map((sheet, i) =>
          scrap(
            layout.sheets[i],
            i,
            spring({ frame: frame - i * 6, fps, config: { damping: 14, mass: 0.6 } }),
            <SheetCard filename={sheet.filename} rows={sheet.rows} width={sheetWidth} scale={scale} />,
          ),
        )}
        {NOTES.map((note, i) =>
          scrap(
            layout.notes[i],
            SHEETS.length + i,
            spring({ frame: frame - (16 + i * 6), fps, config: { damping: 14, mass: 0.6 } }),
            <StickyNote text={note} width={noteWidth} scale={scale} />,
          ),
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          padding: tall ? "0 60px 130px" : "0 120px 90px",
        }}
      >
        <div
          style={{
            padding: tall ? "20px 34px" : "22px 40px",
            borderRadius: 999,
            backgroundColor: colors.primary,
            color: colors.primaryInk,
            fontFamily: fonts.sans,
            fontSize: tall ? 34 : 38,
            fontWeight: 600,
            textAlign: "center",
            opacity: captionIn,
            transform: `translateY(${interpolate(captionIn, [0, 1], [24, 0])}px)`,
          }}
        >
          Arkusz, karteczki i grupa na czacie.
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
