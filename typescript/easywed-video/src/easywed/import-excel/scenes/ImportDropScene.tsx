import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ImportDialog } from "../../components/ImportDialog";
import { useFormat } from "../../format";
import { DialogMotion, dialogScale, ImportPlanner } from "../components/ImportPlanner";
import { FileChip } from "../components/Spreadsheet";
import { FILE_NAME, SHEET_HEADERS, SHEET_MAPPING, sheetFor } from "../sheet";

/** The dialog opens over the planner. */
const OPEN_FROM = 2;
const OPEN_OVER = 18;

/** The file is carried from off the dialog to the drop zone. */
const DRAG_FROM = 40;
const DRAG_TO = 100;

/** The zone takes the drag-over state as the file arrives, and the file is let go. */
const HOVER_FROM = 84;
const HOVER_TO = 98;
const DROP_AT = 110;
const LET_GO_OVER = 10;

export const ImportDropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall } = useFormat();
  const scale = dialogScale(tall);
  const { rows } = sheetFor(hall);

  const open = spring({ frame: frame - OPEN_FROM, fps, config: { damping: 200 }, durationInFrames: OPEN_OVER });
  const approach = interpolate(frame, [DRAG_FROM, DRAG_TO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const letGo = interpolate(frame, [DROP_AT, DROP_AT + LET_GO_OVER], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dragOver =
    interpolate(frame, [HOVER_FROM, HOVER_TO], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    (1 - letGo);
  const pointerIn = interpolate(frame, [DRAG_FROM - 12, DRAG_FROM], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <ImportPlanner
      guests={[]}
      seatFill={hall.tables.map(() => 0)}
      scrim={open}
      modal={
        <DialogMotion open={open} drawer={tall}>
          <ImportDialog
            stage="file"
            drawer={tall}
            scale={scale}
            headers={SHEET_HEADERS}
            rows={rows}
            mapping={SHEET_MAPPING}
            dragOver={dragOver}
            pointer={{
              target: "drop",
              approach,
              pressed: frame < DROP_AT,
              opacity: pointerIn,
              carrying: (
                <div style={{ opacity: 1 - letGo, transform: `scale(${interpolate(letGo, [0, 1], [1, 0.5])})` }}>
                  <FileChip name={FILE_NAME} scale={scale * 0.6} />
                </div>
              ),
            }}
          />
        </DialogMotion>
      }
    />
  );
};
