import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { BrandMark } from "../../components/BrandMark";
import { CallToAction } from "../../components/CallToAction";
import { ImportDialog } from "../../components/ImportDialog";
import { Wordmark } from "../../components/Wordmark";
import { useFormat } from "../../format";
import { DialogMotion, dialogScale, ImportPlanner } from "../components/ImportPlanner";
import { SHEET_HEADERS, SHEET_MAPPING, sheetFor } from "../sheet";
import { IMPORT_EXCEL_SCENES, IMPORT_EXCEL_TRANSITION } from "../timeline";
import { commitApproach, COMMIT_TO } from "./ImportMapScene";

/** This scene's frame 0 on `ImportMapScene`'s clock - the pointer's path runs across the cut. */
const MAP_CLOCK = IMPORT_EXCEL_SCENES.map - IMPORT_EXCEL_TRANSITION;

/** "Dodaj 58 gości" is pressed once the pointer lands, and the dialog closes. */
const PRESS_AT = COMMIT_TO - MAP_CLOCK + 2;
const CLOSE_FROM = PRESS_AT + 6;
const CLOSE_OVER = 14;

/** The list rows arrive behind the closing dialog. */
const ROWS_FROM = CLOSE_FROM + 6;
const ROW_STEP = 5;

/** Tables take their guests one after another, as `PlanScene` fills its room. */
const FILL_FROM = 40;
const FILL_STEP = 6;
const FILL_OVER = 26;

/**
 * The planner gives way to the CTA card, then the mark and the call to action
 * land. Earlier than the room's fill alone would need: at 134 the pill held for
 * barely 40 frames before the cut, against the teaser's and the report's ~70.
 */
const CTA_FROM = 124;
const CTA_OVER = 14;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ImportLandedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall } = useFormat();
  const scale = dialogScale(tall);
  const { guests, rows } = sheetFor(hall);

  const close = interpolate(frame, [CLOSE_FROM, CLOSE_FROM + CLOSE_OVER], [0, 1], clamp);
  const committed = frame >= CLOSE_FROM;
  const listIn = spring({ frame: frame - CLOSE_FROM, fps, config: { damping: 200 }, durationInFrames: 20 });
  const rowIn = guests.map((_, i) =>
    spring({ frame: frame - (ROWS_FROM + i * ROW_STEP), fps, config: { damping: 200 }, durationInFrames: 18 }),
  );

  const seatFill = hall.tables.map((_, i) =>
    interpolate(frame, [FILL_FROM + i * FILL_STEP, FILL_FROM + i * FILL_STEP + FILL_OVER], [0, 1], clamp),
  );

  const ctaIn = interpolate(frame, [CTA_FROM, CTA_FROM + CTA_OVER], [0, 1], clamp);
  const markIn = spring({ frame: frame - (CTA_FROM + 4), fps, config: { damping: 13, mass: 0.6 } });
  const fillProgress = spring({ frame: frame - (CTA_FROM + 14), fps, config: { damping: 11, mass: 0.5 } });

  return (
    <AbsoluteFill>
      <ImportPlanner
        guests={committed ? guests : []}
        seatFill={seatFill}
        listIn={listIn}
        rowIn={rowIn}
        scrim={1 - close}
        modal={
          close < 1 ? (
            <DialogMotion open={1 - close} drawer={tall}>
              <ImportDialog
                stage="preview"
                drawer={tall}
                scale={scale}
                headers={SHEET_HEADERS}
                rows={rows}
                mapping={SHEET_MAPPING}
                guests={guests}
                pointer={{
                  target: "commit",
                  approach: commitApproach(frame + MAP_CLOCK),
                  pressed: frame >= PRESS_AT && frame < CLOSE_FROM + 4,
                  opacity: 1 - close,
                }}
              />
            </DialogMotion>
          ) : null
        }
      />

      {frame >= CTA_FROM ? (
        <AbsoluteFill style={{ opacity: ctaIn }}>
          <Backdrop>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
                <BrandMark size={tall ? 110 : 120} seatProgress={1} fillProgress={fillProgress} />
                <Wordmark size={tall ? 96 : 104} />
              </div>

              <CallToAction
                action="Wczytaj swoją listę gości"
                from={CTA_FROM + 18}
                actionSize={tall ? 48 : 44}
                urlSize={tall ? 42 : 40}
                marginTop={tall ? 64 : 56}
              />
            </AbsoluteFill>
          </Backdrop>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
