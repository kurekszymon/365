import React from "react";
import { useCurrentFrame } from "remotion";
import { TryNowStage } from "../components/TryNowStage";
import { TRY_NOW_STARTS } from "../timeline";

/**
 * easywed.app open in the phone's browser on the landing page's hero, the
 * stopwatch at 0:00; the hook is up on frame 0. The thumb takes *Wypróbujcie
 * bez konta*, the stopwatch starts, and the planner opens.
 */
export const TryNowHookScene: React.FC = () => <TryNowStage frame={useCurrentFrame() + TRY_NOW_STARTS.hook} />;
