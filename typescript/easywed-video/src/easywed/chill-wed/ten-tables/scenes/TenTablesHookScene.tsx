import React from "react";
import { useCurrentFrame } from "remotion";
import { TenTablesStage } from "../components/TenTablesStage";
import { TEN_TABLES_STARTS } from "../timeline";

/**
 * The couple's laptop on an empty 14x16 m hall, the venue's line already up on
 * frame 0. The pointer comes in and right-clicks near the top-left of the
 * room; the canvas menu opens and *Dodaj stoły* is picked.
 */
export const TenTablesHookScene: React.FC = () => <TenTablesStage frame={useCurrentFrame() + TEN_TABLES_STARTS.hook} />;
