import React from "react";
import { useCurrentFrame } from "remotion";
import { SwapCutPlanner } from "../components/SwapCutPlanner";
import { SWAP_CUT_STARTS } from "../timeline";

/**
 * A room where every chair is taken, every table reading 8 / 8, and the
 * question. The pointer comes in and presses one chair at Stół 4.
 */
export const SwapCutHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SwapCutPlanner frame={frame + SWAP_CUT_STARTS.hook} />;
};
