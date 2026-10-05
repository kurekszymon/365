import React from "react";
import { useCurrentFrame } from "remotion";
import { SwapCutPlanner } from "../components/SwapCutPlanner";
import { SWAP_CUT_STARTS } from "../timeline";

/**
 * The empty chair at Stół 1, its popover listing *Przy tym stole* and then
 * *Bez stołu*; his name typed, he is picked, the table reads 8 / 8 again, and
 * the payoff lands.
 *
 * `start` is this scene's frame 0 on the cut's clock. It defaults to where the
 * cut puts it; a film that crossfades into it for longer than the cut's 8
 * frames starts it earlier, so the two sides of the seam still draw one pose.
 */
export const SwapCutReseatScene: React.FC<{ start?: number }> = ({ start = SWAP_CUT_STARTS.reseat }) => {
  const frame = useCurrentFrame();
  return <SwapCutPlanner frame={frame + start} />;
};
