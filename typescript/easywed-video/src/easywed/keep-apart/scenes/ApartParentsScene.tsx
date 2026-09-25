import React from "react";
import { useCurrentFrame } from "remotion";
import { ApartPlanner } from "../components/ApartPlanner";
import { KEEP_APART_STARTS } from "../timeline";

/**
 * Rodzina taty pressed and dragged over the dance floor with its eight chairs
 * and their initials, into the spot Stół 6 left, let go and snapped to the
 * grid, while the view pulls back over both tables.
 */
export const ApartParentsScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <ApartPlanner frame={frame + KEEP_APART_STARTS.parents} />;
};
