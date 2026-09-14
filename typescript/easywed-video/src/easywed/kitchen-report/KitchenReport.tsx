import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors } from "../theme";
import { ReportHookScene } from "./scenes/ReportHookScene";
import { ReportTagsScene } from "./scenes/ReportTagsScene";
import { ReportSheetScene } from "./scenes/ReportSheetScene";
import { ReportCtaScene } from "./scenes/ReportCtaScene";
import { KITCHEN_REPORT_SCENES, KITCHEN_REPORT_TRANSITION } from "./timeline";

const cut = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: KITCHEN_REPORT_TRANSITION })}
  />
);

/** The 18 s cut: the venue's, florist's and kitchen's questions, the diets on the list, the printed report, the CTA. */
export const KitchenReport: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={KITCHEN_REPORT_SCENES.hook}>
          <ReportHookScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KITCHEN_REPORT_SCENES.tags}>
          <ReportTagsScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KITCHEN_REPORT_SCENES.sheet}>
          <ReportSheetScene />
        </TransitionSeries.Sequence>
        {cut}
        <TransitionSeries.Sequence durationInFrames={KITCHEN_REPORT_SCENES.cta}>
          <ReportCtaScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
