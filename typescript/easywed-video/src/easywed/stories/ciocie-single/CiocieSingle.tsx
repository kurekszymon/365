import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../../theme";
import { CiocieHookScene } from "./scenes/CiocieHookScene";
import { CiocieSingleScene } from "./scenes/CiocieSingleScene";
import { CiocieAuntsScene } from "./scenes/CiocieAuntsScene";
import { CiocieCtaScene } from "./scenes/CiocieCtaScene";
import { CIOCIE_SCENES, CIOCIE_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: CIOCIE_TRANSITION })}
  />
);

/** The 16 s ciocie-single cut: two tables named *Single* and *Ciocie*, and the dance floor already between them - the CTA. */
export const CiocieSingle: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={CIOCIE_SCENES.hook}>
          <CiocieHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={CIOCIE_SCENES.single}>
          <CiocieSingleScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={CIOCIE_SCENES.ciocie}>
          <CiocieAuntsScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={CIOCIE_SCENES.cta}>
          <CiocieCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
