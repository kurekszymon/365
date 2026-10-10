import React from "react";
import { useCurrentFrame } from "remotion";
import { SwapPlanner } from "../components/SwapPlanner";
import { SWAP_STARTS } from "../timeline";

/**
 * A room where every chair is already taken, and the question. Frame 0 is the
 * bare planner - no question, no pointer, no popover - because the loop's seam
 * lands back on it. The pointer then picks one chair at Stół 4.
 */
export const SwapHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SwapPlanner frame={frame + SWAP_STARTS.hook} />;
};
