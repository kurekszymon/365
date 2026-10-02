import React from "react";
import { useCurrentFrame } from "remotion";
import { ShapePlanner } from "../components/ShapePlanner";
import { SHAPE_STARTS } from "../timeline";

/**
 * The seated room, drawn as a plain rectangle, and the question. Frame 0 is the
 * bare planner - no question, no pointer, no dialog - because the loop's seam
 * lands back on it. The pointer then opens the hall's settings from its label
 * chip and heads for the shape group.
 */
export const ShapeHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <ShapePlanner frame={frame + SHAPE_STARTS.hook} />;
};
