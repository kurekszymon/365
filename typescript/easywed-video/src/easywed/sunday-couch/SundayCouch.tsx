import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { CouchHookScene } from "./scenes/CouchHookScene";
import { CouchHallScene } from "./scenes/CouchHallScene";
import { CouchSeatingScene } from "./scenes/CouchSeatingScene";
import { CouchDoneScene } from "./scenes/CouchDoneScene";
import { CouchCtaScene } from "./scenes/CouchCtaScene";
import { SUNDAY_COUCH_SCENES, SUNDAY_COUCH_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: SUNDAY_COUCH_TRANSITION })}
  />
);

/** The 22.7 s sunday-couch cut: one evening on one laptop, from the empty hall at 19:40 to everyone seated at 22:30, the CTA. */
export const SundayCouch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SUNDAY_COUCH_SCENES.hook}>
          <CouchHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SUNDAY_COUCH_SCENES.hall}>
          <CouchHallScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SUNDAY_COUCH_SCENES.seating}>
          <CouchSeatingScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SUNDAY_COUCH_SCENES.done}>
          <CouchDoneScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={SUNDAY_COUCH_SCENES.cta}>
          <CouchCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
