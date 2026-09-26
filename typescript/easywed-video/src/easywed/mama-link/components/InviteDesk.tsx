import React from "react";
import { Easing, interpolate } from "remotion";
import { AppFrame } from "../../components/AppFrame";
import { Cursor } from "../../components/Cursor";
import { HallCanvas } from "../../components/HallCanvas";
import { chromeScale, PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import type { Point } from "../../geometry";
import { WIDTH, HEIGHT } from "../../timeline";
import { colors, shadow } from "../../theme";
import { INVITE_EXPIRES } from "../guests";
import {
  CAMERA_TO_DIALOG,
  COPIED,
  DESK_POINTER_IN,
  DESK_TRAVEL,
  DIALOG_OPEN,
  DIALOG_POINTER_IN,
  DIALOG_POINTER_OUT,
  PRESS_COPY,
  PRESS_CREATE,
  PRESS_HELD,
  PRESS_INVITE,
  PRESS_ROLE,
  PRESS_VIEWER,
  POINTER_ASIDE,
  ROW_IN,
  type Press,
} from "../script";
import { dialogHeight, dialogTargets, DIALOG, MembersDialog } from "./MembersDialog";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The desktop the couple plans on, at the landscape cut's own size - so its chrome is the 16:9 films'. */
const DESK = { width: WIDTH, height: HEIGHT };
/** App CSS px to desktop px, as `AppFrame` and `PlannerCanvas` scale their chrome in landscape. */
const APP_PX = chromeScale(false);

/**
 * The camera, in desktop pixels: `focus` lands on `at` in the frame, `zoom`
 * times the desktop's own size. Close on the header's right end - the member
 * stack and its dashed invite circle - then pulled back and across to the
 * dialog centred in the window. The laptop's screen fills the frame's width
 * and runs off both sides; only its top edge shows.
 */
type Shot = { focus: Point; at: Point; zoom: number };
const SHOT_HEADER: Shot = { focus: { x: 1330, y: 77 }, at: { x: 440, y: 520 }, zoom: 2.1 };
const SHOT_DIALOG: Shot = { focus: { x: DESK.width / 2, y: DESK.height / 2 }, at: { x: 540, y: 1010 }, zoom: 1.2 };

/** The pointer's size in desktop pixels - about keep-apart's `pointer: 2.2` on screen once the camera's zoom is applied. */
const POINTER = 1.5;

/** The first pointer comes up from the plan below the header, this far from the circle it presses. */
const POINTER_FROM: Point = { x: 150, y: 560 };
/** The second enters over the dialog's lower right, in desktop pixels. */
const DIALOG_POINTER_FROM: Point = { x: 1250, y: 880 };

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const isPressed = (frame: number, press: Press) => frame >= press.at && frame < press.at + PRESS_HELD;

/**
 * The couple's laptop at `frame` on the cut's clock: the planner on the
 * wedding they saved to their account, the invite circle pressed, and the
 * *Członkowie* dialog worked top to bottom - *Podgląd*, *Utwórz link
 * zaproszenia*, *Kopiuj link*.
 */
export const InviteDesk: React.FC<{ frame: number }> = ({ frame }) => {
  const { hall } = useFormat();

  const pan = interpolate(frame, CAMERA_TO_DIALOG, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const zoom = SHOT_HEADER.zoom + (SHOT_DIALOG.zoom - SHOT_HEADER.zoom) * pan;
  const focus = mix(SHOT_HEADER.focus, SHOT_DIALOG.focus, pan);
  const at = mix(SHOT_HEADER.at, SHOT_DIALOG.at, pan);

  // The pointer that presses the invite circle, placed from the circle itself.
  const reach = interpolate(frame, DESK_TRAVEL, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const handoff = interpolate(frame, [PRESS_INVITE + 4, PRESS_INVITE + 10], [1, 0], clamp);
  const firstPointer = (
    <svg width={1} height={1} style={{ position: "absolute", overflow: "visible" }}>
      <g transform={`translate(${POINTER_FROM.x * (1 - reach)} ${POINTER_FROM.y * (1 - reach)}) scale(${POINTER})`}>
        <Cursor
          x={0}
          y={0}
          opacity={interpolate(frame, DESK_POINTER_IN, [0, 1], clamp) * handoff}
          pressed={frame >= PRESS_INVITE && frame < PRESS_INVITE + PRESS_HELD}
        />
      </g>
    </svg>
  );

  // The dialog, as `handleCreate` and `handleCopy` move it along.
  const open = interpolate(frame, DIALOG_OPEN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const pending = interpolate(frame, ROW_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const created = frame >= ROW_IN[0];
  const chosen = frame >= PRESS_VIEWER.at + PRESS_HELD && !created;
  const height = dialogHeight(pending);
  const dialogAt = { x: DESK.width / 2 - (DIALOG.width * APP_PX) / 2, y: DESK.height / 2 - (height * APP_PX) / 2 };
  const toDesk = (p: Point): Point => ({ x: dialogAt.x + p.x * APP_PX, y: dialogAt.y + p.y * APP_PX });

  // The second pointer's stops, each reached two frames before its press.
  const targets = dialogTargets();
  const stops: { at: Point; press: Press }[] = [
    { at: toDesk(targets.role), press: PRESS_ROLE },
    { at: toDesk(targets.viewer), press: PRESS_VIEWER },
    { at: toDesk(targets.create), press: PRESS_CREATE },
    { at: toDesk(targets.copy), press: PRESS_COPY },
  ];
  let pointer = DIALOG_POINTER_FROM;
  for (let i = 0; i < stops.length; i++) {
    const arriveAt = stops[i].press.at - 2;
    const depart = arriveAt - stops[i].press.travel;
    if (frame < depart) break;
    const from = i === 0 ? DIALOG_POINTER_FROM : stops[i - 1].at;
    const t = interpolate(frame, [depart, arriveAt], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    pointer = mix(from, stops[i].at, t);
  }
  const aside = interpolate(frame, POINTER_ASIDE, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  pointer = { x: pointer.x + 70 * aside, y: pointer.y + 90 * aside };
  const pointerOpacity =
    interpolate(frame, DIALOG_POINTER_IN, [0, 1], clamp) * interpolate(frame, DIALOG_POINTER_OUT, [1, 0], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: DESK.width,
        height: DESK.height,
        transformOrigin: "0 0",
        transform: `translate(${at.x - focus.x * zoom}px, ${at.y - focus.y * zoom}px) scale(${zoom})`,
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: shadow.card,
        backgroundColor: colors.bg,
      }}
    >
      <AppFrame activeRail="guests" desktop inviteSlot={firstPointer}>
        <div style={{ flex: 1, display: "flex", padding: "24px 28px 28px", minWidth: 0 }}>
          <PlannerCanvas hall={hall} tall={false}>
            <HallCanvas
              hall={hall}
              outline={1}
              floor={1}
              tableIn={hall.tables.map(() => 1)}
              seatFill={hall.tables.map(() => 1)}
            />
          </PlannerCanvas>
        </div>
      </AppFrame>

      {open > 0 ? (
        <>
          {/* `DialogOverlay`: `bg-black/10` and `backdrop-blur-xs` over the whole window. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: colors.scrim,
              backdropFilter: `blur(${4 * APP_PX}px)`,
              opacity: open,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: dialogAt.x,
              top: dialogAt.y,
              transformOrigin: "0 0",
              // `zoom-in-95` about the dialog's own centre.
              transform: `translate(${(DIALOG.width * APP_PX * (1 - (0.95 + 0.05 * open))) / 2}px, ${
                (height * APP_PX * (1 - (0.95 + 0.05 * open))) / 2
              }px) scale(${APP_PX * (0.95 + 0.05 * open)})`,
              opacity: open,
            }}
          >
            <MembersDialog
              role={chosen ? "viewer" : "editor"}
              selectOpen={frame >= PRESS_ROLE.at + 1 && frame < PRESS_VIEWER.at + PRESS_HELD}
              viewerPressed={frame >= PRESS_VIEWER.at - 2}
              createPressed={isPressed(frame, PRESS_CREATE)}
              submitting={frame >= PRESS_CREATE.at + 2 && !created}
              pending={pending}
              invite={{ role: "viewer", expires: INVITE_EXPIRES }}
              copyPressed={isPressed(frame, PRESS_COPY)}
              copied={frame >= COPIED[0] && frame < COPIED[1]}
            />
          </div>
        </>
      ) : null}

      <svg width={DESK.width} height={DESK.height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`translate(${pointer.x} ${pointer.y}) scale(${POINTER})`}>
          <Cursor x={0} y={0} opacity={pointerOpacity} pressed={stops.some((stop) => isPressed(frame, stop.press))} />
        </g>
      </svg>
    </div>
  );
};
