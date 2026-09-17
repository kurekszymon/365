import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../../components/Cursor";
import { useFormat } from "../../format";
import { colors } from "../../theme";
import {
  AGE_GROUP_PRESETS,
  DrawerMotion,
  drawerScale,
  EditGuestDrawer,
  type DrawerPointer,
} from "../components/EditGuestDrawer";
import { GuestPanel, panelGeometry, pencilAt, scrollTo } from "../components/GuestPanel";
import { guestListFor, rowOf, TAGGED_ON_CAMERA } from "../guests";
import { ROW_OFFSET } from "./KidsHookScene";

/**
 * Two guests tagged on camera. The first takes a preset - the pencil on his
 * row, `Grupa wiekowa`, `0-3 lata`, `Zapisz` - and the filter chip appears
 * behind him, because the app only offers it once someone is a child. The
 * second needs a bracket the app does not ship, so it is typed into the row's
 * own field, which is how the ranges stay the couple's own.
 *
 * A hard cut between the two: tagging five in a row would be the report cut's
 * beat, and this film's payoff is the number, not the tagging.
 */

/**
 * Where the second guest's beat starts, on this scene's clock. The first beat
 * keeps the longer half: the cut moves the list to another table, so the badge
 * it just earned and the chip it just created have to be read before it lands.
 */
const CUT = 80;

/** Beat one, from its own frame 0: the pencil, the sheet, the preset, save. */
const A = {
  reach: [0, 8],
  press: 10,
  open: 12,
  pick: [26, 34],
  pickPress: 36,
  save: [40, 48],
  savePress: 50,
  close: 52,
  badge: 54,
  /** The sheet is gone by 60, and his row holds the frame to 79 - 20 frames of payoff. */
};

/** Beat two, from the cut: the same shape, with the bracket typed in between. */
const B = {
  reach: [2, 10],
  press: 12,
  open: 14,
  custom: [28, 36],
  customPress: 38,
  typeFrom: 42,
  typeStep: 3,
  confirm: [56, 64],
  confirmPress: 66,
  save: [70, 78],
  savePress: 80,
  close: 82,
  badge: 84,
  /** His badge lands at 84 and carries into the next beat, which holds the same rows. */
};

/** How long a press reads as held down, and how long the sheet takes to arrive or leave. */
const PRESS_HELD = 5;
const OPEN_OVER = 13;
/**
 * Short: in landscape the sheet is a centred dialog that fades rather than
 * sliding away, and every frame it spends half-transparent is one where the
 * guest list reads through the form on top of it.
 */
const CLOSE_OVER = 5;

/** The bracket the couple types for the older children. `canonicalizeAgeGroup` keeps it verbatim. */
const CUSTOM_BRACKET = TAGGED_ON_CAMERA[1].ageGroup;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) } as const;

export const KidsTagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall } = useFormat();
  const guests = guestListFor(hall);
  const geometry = panelGeometry(tall, frameWidth, frameHeight);
  const scale = drawerScale(tall);

  const second = frame >= CUT;
  const t = second ? frame - CUT : frame;
  const beat = second ? B : A;
  const guest = TAGGED_ON_CAMERA[second ? 1 : 0];
  const row = rowOf(guests, guest.name);
  const scroll = scrollTo(guests, row, ROW_OFFSET);

  // The sheet, from the press on the pencil to the press on Zapisz.
  const open =
    spring({ frame: t - beat.open, fps, config: { damping: 200 }, durationInFrames: OPEN_OVER }) *
    (1 - interpolate(t, [beat.close, beat.close + CLOSE_OVER], [0, 1], clamp));

  const scrim = Math.min(1, open * 1.8);

  // The two brackets land on their rows as each sheet closes; nobody else is tagged yet.
  const tagged = [
    spring({ frame: frame - A.badge, fps, config: { damping: 12, mass: 0.5 } }),
    spring({ frame: frame - (CUT + B.badge), fps, config: { damping: 12, mass: 0.5 } }),
  ];
  const aged = guests.map((entry) => {
    const index = TAGGED_ON_CAMERA.findIndex((kid) => kid.name === entry.name);
    return index >= 0 ? tagged[index] : 0;
  });

  // The cursor reaches the row's pencil, presses, and goes with the sheet.
  const reachRow = interpolate(t, beat.reach, [0, 1], ease);
  const at = pencilAt(geometry, guests, row, scroll);
  const rowCursorAway = 1 - reachRow;
  const rowCursor =
    open < 0.35 && t < beat.open + OPEN_OVER ? (
      <div
        style={{
          position: "absolute",
          left: at.x,
          top: at.y,
          opacity: interpolate(t, [beat.open + 4, beat.open + 12], [1, 0], clamp),
          transform: `translate(${150 * geometry.scale * rowCursorAway}px, ${-190 * geometry.scale * rowCursorAway}px)`,
        }}
      >
        <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g transform={`scale(${geometry.scale * 1.05})`}>
            <Cursor
              x={0}
              y={0}
              opacity={1}
              pressed={t >= beat.press && t < beat.press + PRESS_HELD}
            />
          </g>
        </svg>
      </div>
    ) : null;

  // What the sheet shows: the bracket picked, and - in beat two - the one typed.
  let pointer: DrawerPointer | undefined;
  let selected = "adult";
  let options = AGE_GROUP_PRESETS;
  let adding = 0;
  let draft = "";

  if (!second) {
    if (t >= A.pickPress) selected = guest.ageGroup;
    if (t >= A.pick[0] && t < A.save[0]) {
      pointer = {
        target: `age:${guest.ageGroup}`,
        approach: interpolate(t, A.pick, [0, 1], ease),
        pressed: t >= A.pickPress && t < A.pickPress + PRESS_HELD,
      };
    } else if (t >= A.save[0]) {
      pointer = {
        target: "save",
        approach: interpolate(t, A.save, [0, 1], ease),
        pressed: t >= A.savePress && t < A.savePress + PRESS_HELD,
      };
    }
  } else {
    const typed = Math.max(0, Math.min(CUSTOM_BRACKET.length, Math.floor((t - B.typeFrom) / B.typeStep)));
    const committed = t >= B.confirmPress;
    adding = t >= B.customPress && !committed ? 1 : 0;
    draft = CUSTOM_BRACKET.slice(0, typed);
    if (committed) {
      options = [...AGE_GROUP_PRESETS, CUSTOM_BRACKET];
      selected = CUSTOM_BRACKET;
    }
    if (t >= B.custom[0] && t < B.confirm[0]) {
      pointer = {
        target: "custom",
        approach: interpolate(t, B.custom, [0, 1], ease),
        pressed: t >= B.customPress && t < B.customPress + PRESS_HELD,
      };
    } else if (t >= B.confirm[0] && t < B.save[0]) {
      pointer = {
        target: "confirm",
        approach: interpolate(t, B.confirm, [0, 1], ease),
        pressed: t >= B.confirmPress && t < B.confirmPress + PRESS_HELD,
      };
    } else if (t >= B.save[0]) {
      pointer = {
        target: "save",
        approach: interpolate(t, B.save, [0, 1], ease),
        pressed: t >= B.savePress && t < B.savePress + PRESS_HELD,
      };
    }
  }

  return (
    <GuestPanel guests={guests} scroll={scroll} aged={aged}>
      {rowCursor}

      <AbsoluteFill
        style={{
          alignItems: tall ? "stretch" : "center",
          justifyContent: tall ? "flex-end" : "center",
          padding: tall ? 0 : 60,
          pointerEvents: "none",
        }}
      >
        {/* The scrim holds while the sheet fades, so the list behind it stays
            blurred rather than reading through the form on its way out. */}
        <AbsoluteFill
          style={{
            backgroundColor: colors.scrim,
            opacity: scrim,
            backdropFilter: `blur(${4 * scrim}px)`,
          }}
        />
        {open > 0.01 ? (
          <DrawerMotion open={open} drawer={tall}>
            <EditGuestDrawer
              drawer={tall}
              scale={scale}
              name={guest.name}
              options={options}
              selected={selected}
              adding={adding}
              draft={draft}
              caret={adding > 0 && t < B.confirmPress}
              pointer={pointer}
            />
          </DrawerMotion>
        ) : null}
      </AbsoluteFill>
    </GuestPanel>
  );
};
