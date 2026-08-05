import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { IntroScene } from "./scenes/IntroScene";
import { HallScene } from "./scenes/HallScene";
import { GuestsScene } from "./scenes/GuestsScene";
import { SeatingScene } from "./scenes/SeatingScene";
import { OutroScene } from "./scenes/OutroScene";
import { SCENES, TRANSITION } from "./timeline";
import { colors } from "./theme";

const crossfade = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRANSITION })}
  />
);

/** The whole film: the five scenes, crossfaded. */
export const Film: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.intro}>
          <IntroScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={SCENES.hall}>
          <HallScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={SCENES.guests}>
          <GuestsScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={SCENES.seating}>
          <SeatingScene />
        </TransitionSeries.Sequence>
        {crossfade}
        <TransitionSeries.Sequence durationInFrames={SCENES.outro}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
