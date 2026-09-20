import React from "react";
import { useCurrentFrame } from "remotion";
import { LOOP_SEAM, LoopSeam } from "../../components/LoopSeam";
import { ScalePlanner } from "../components/ScalePlanner";
import { SCALE_SCENES, SCALE_STARTS } from "../timeline";
import { ScaleHookScene } from "./ScaleHookScene";

/**
 * Stół 5 up to the dance floor, then the payoff. As a page loop it closes on
 * `LoopSeam` back to the hook's frame 0; the walkthrough, which carries on into
 * its next chapter, passes `loop={false}`.
 */
export const ScaleGapScene: React.FC<{ loop?: boolean }> = ({ loop = true }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <ScalePlanner frame={frame + SCALE_STARTS.gap} />
      {loop ? (
        <LoopSeam from={SCALE_SCENES.gap - LOOP_SEAM}>
          <ScaleHookScene />
        </LoopSeam>
      ) : null}
    </>
  );
};
