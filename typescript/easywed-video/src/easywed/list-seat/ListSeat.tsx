import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { ListSeatHookScene } from "./scenes/ListSeatHookScene";
import { ListSeatTablesScene } from "./scenes/ListSeatTablesScene";
import { ListSeatSeatScene } from "./scenes/ListSeatSeatScene";
import { ListSeatCtaScene } from "./scenes/ListSeatCtaScene";
import { LIST_SEAT_SCENES, LIST_SEAT_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: LIST_SEAT_TRANSITION })}
  />
);

/** The 16 s list-seat cut: the cousin who is coming after all, seated from the guest list itself - table, chair, done - the CTA. */
export const ListSeat: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={LIST_SEAT_SCENES.hook}>
          <ListSeatHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={LIST_SEAT_SCENES.tables}>
          <ListSeatTablesScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={LIST_SEAT_SCENES.seat}>
          <ListSeatSeatScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={LIST_SEAT_SCENES.cta}>
          <ListSeatCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
