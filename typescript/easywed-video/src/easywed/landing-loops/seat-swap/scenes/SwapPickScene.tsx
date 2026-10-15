import React from "react";
import { useCurrentFrame } from "remotion";
import { SwapPlanner } from "../components/SwapPlanner";
import { SWAP_STARTS } from "../timeline";

/**
 * The seat popover: the chair's occupant, the rest of his table, then the whole
 * room in amber. A guest from another table is picked, so the table being full
 * turns him out of it and empties the chair she came from.
 */
export const SwapPickScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SwapPlanner frame={frame + SWAP_STARTS.pick} />;
};
