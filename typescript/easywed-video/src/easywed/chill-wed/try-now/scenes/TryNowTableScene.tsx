import React from "react";
import { useCurrentFrame } from "remotion";
import { TryNowStage } from "../components/TryNowStage";
import { TRY_NOW_STARTS } from "../timeline";

/**
 * The seeded hall in guest mode, the first-run card at 0 of 3; `AddFab`, the
 * add hub, *Okrągły 8* and its form; the table in the middle of the hall, the
 * plan pinched in on it until its `0 / 8` reads, and *Goście* in the tab bar.
 */
export const TryNowTableScene: React.FC = () => <TryNowStage frame={useCurrentFrame() + TRY_NOW_STARTS.table} />;
