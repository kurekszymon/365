import React from "react";
import { useCurrentFrame } from "remotion";
import { ScalePlanner } from "../components/ScalePlanner";
import { SCALE_STARTS } from "../timeline";

/**
 * The seated room and the question. Frame 0 is the bare planner - no question,
 * no pointer, the measure tool off - because the loop's seam lands back on it.
 * The pointer then switches *Mierzenie* on and its mode over to *Krawędź*.
 */
export const ScaleHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <ScalePlanner frame={frame + SCALE_STARTS.hook} />;
};
