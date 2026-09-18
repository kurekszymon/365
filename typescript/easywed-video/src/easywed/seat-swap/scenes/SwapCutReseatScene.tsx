import React from "react";
import { useCurrentFrame } from "remotion";
import { SwapCutPlanner } from "../components/SwapCutPlanner";
import { SWAP_CUT_STARTS } from "../timeline";

/**
 * The empty chair at Stół 1, its popover listing *Przy tym stole* and then
 * *Bez stołu*; his name typed, he is picked, the table reads 8 / 8 again, and
 * the payoff lands.
 */
export const SwapCutReseatScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SwapCutPlanner frame={frame + SWAP_CUT_STARTS.reseat} />;
};
