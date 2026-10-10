import React from "react";
import { useCurrentFrame } from "remotion";
import { CouchPlanner } from "../components/CouchPlanner";
import { SUNDAY_COUCH_STARTS } from "../timeline";

/**
 * 20:10: in on the room as the dance floor and the bar land, the head table
 * facing them, then the round tables all round - and the count, read off the room.
 */
export const CouchHallScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <CouchPlanner frame={frame + SUNDAY_COUCH_STARTS.hall} />;
};
