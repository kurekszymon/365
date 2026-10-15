import React from "react";
import { useCurrentFrame } from "remotion";
import { CouchPlanner } from "../components/CouchPlanner";
import { SUNDAY_COUCH_STARTS } from "../timeline";

/**
 * 21:05: the guests are on the list and the panel is open. The head table
 * and its neighbours fill first, then the camera takes the bar and Stół 3,
 * seated chair by chair, initials and all.
 */
export const CouchSeatingScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <CouchPlanner frame={frame + SUNDAY_COUCH_STARTS.seating} />;
};
