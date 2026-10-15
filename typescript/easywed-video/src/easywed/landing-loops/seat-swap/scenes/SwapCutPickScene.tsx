import React from "react";
import { useCurrentFrame } from "remotion";
import { SwapCutPlanner } from "../components/SwapCutPlanner";
import { SWAP_CUT_STARTS } from "../timeline";

/**
 * The seat popover over Stół 4's chair: its occupant, the rest of his table,
 * then a name typed into the search until one amber row is left. She is picked,
 * the table being full turns him out of it, and Stół 1 drops to 7 / 8.
 */
export const SwapCutPickScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SwapCutPlanner frame={frame + SWAP_CUT_STARTS.pick} />;
};
