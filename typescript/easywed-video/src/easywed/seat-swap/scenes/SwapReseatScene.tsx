import React from "react";
import { useCurrentFrame } from "remotion";
import { LOOP_SEAM, LoopSeam } from "../../components/LoopSeam";
import { SwapPlanner } from "../components/SwapPlanner";
import { SWAP_SCENES, SWAP_STARTS } from "../timeline";
import { SwapHookScene } from "./SwapHookScene";

/**
 * The empty chair, the popover led by *Bez stołu*, and the payoff. As a page
 * loop it closes on `LoopSeam` back to the hook's frame 0 - the same full room
 * it started from; the walkthrough, which carries on into its next chapter,
 * passes `loop={false}`.
 */
export const SwapReseatScene: React.FC<{ loop?: boolean }> = ({ loop = true }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <SwapPlanner frame={frame + SWAP_STARTS.reseat} />
      {loop ? (
        <LoopSeam from={SWAP_SCENES.reseat - LOOP_SEAM}>
          <SwapHookScene />
        </LoopSeam>
      ) : null}
    </>
  );
};
