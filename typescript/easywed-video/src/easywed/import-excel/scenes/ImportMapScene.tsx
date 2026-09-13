import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { IMPORT_FIELDS, ImportDialog, type ImportPointer } from "../../components/ImportDialog";
import { useFormat } from "../../format";
import { DialogMotion, dialogScale, ImportPlanner } from "../components/ImportPlanner";
import { SHEET_HEADERS, SHEET_MAPPING, sheetFor } from "../sheet";

/** Each field settles onto its column in turn, the column lighting up with it. */
const SNAP_FROM = 12;
const SNAP_STEP = 12;
const SNAP_OVER = 14;

/** The pointer goes to "Dalej" and presses it; the wizard moves on to its preview. */
const NEXT_FROM = 72;
const NEXT_TO = 98;
const PRESS_AT = 100;
const PREVIEW_AT = 106;
const SWAP_OVER = 8;

/**
 * The pointer heading for the commit button. It lands after the cut, so
 * `ImportLandedScene` reads these to carry the same path across it.
 */
export const COMMIT_FROM = 146;
export const COMMIT_TO = 190;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Shared with `ImportLandedScene`, so both sides of the cut compute one path. */
export const commitApproach = (mapFrame: number): number =>
  interpolate(mapFrame, [COMMIT_FROM, COMMIT_TO], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

export const ImportMapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { hall, tall } = useFormat();
  const scale = dialogScale(tall);
  const { guests, rows } = sheetFor(hall);

  const snap = IMPORT_FIELDS.map((_, i) =>
    interpolate(frame, [SNAP_FROM + i * SNAP_STEP, SNAP_FROM + i * SNAP_STEP + SNAP_OVER], [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }),
  );

  const previewing = frame >= PREVIEW_AT;

  const pointer: ImportPointer = previewing
    ? {
        target: "commit",
        approach: commitApproach(frame),
        opacity: interpolate(frame, [COMMIT_FROM - 8, COMMIT_FROM], [0, 1], clamp),
      }
    : {
        target: "next",
        approach: interpolate(frame, [NEXT_FROM, NEXT_TO], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }),
        pressed: frame >= PRESS_AT,
        opacity: interpolate(frame, [NEXT_FROM - 8, NEXT_FROM], [0, 1], clamp),
      };

  return (
    <ImportPlanner
      guests={[]}
      seatFill={hall.tables.map(() => 0)}
      scrim={1}
      modal={
        <DialogMotion open={1} drawer={tall}>
          <ImportDialog
            stage={previewing ? "preview" : "mapping"}
            drawer={tall}
            scale={scale}
            headers={SHEET_HEADERS}
            rows={rows}
            mapping={SHEET_MAPPING}
            snap={snap}
            guests={guests}
            contentOpacity={previewing ? interpolate(frame, [PREVIEW_AT, PREVIEW_AT + SWAP_OVER], [0, 1], clamp) : 1}
            pointer={pointer}
          />
        </DialogMotion>
      }
    />
  );
};
