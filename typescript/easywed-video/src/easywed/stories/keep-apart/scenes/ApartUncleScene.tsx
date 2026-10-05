import React from "react";
import { useCurrentFrame } from "remotion";
import { ApartPlanner } from "../components/ApartPlanner";
import { KEEP_APART_STARTS } from "../timeline";

/**
 * Stół 6 dragged to the far corner, guests and all, while the view pulls back
 * over the whole room; then the camera pushes in on the two family tables,
 * one behind the other, and the parents' line takes over.
 */
export const ApartUncleScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <ApartPlanner frame={frame + KEEP_APART_STARTS.uncle} />;
};
