import React from "react";
import { useCurrentFrame } from "remotion";
import { TableShapeStage } from "../components/TableShapeStage";
import { TABLE_SHAPE_STARTS } from "../timeline";

/**
 * The couple's phone zoomed in on Stół 3, round and seated, every chair
 * initialled; the hook is up on frame 0. The table is tapped, its toolbar's
 * pen opens the form.
 */
export const TableShapeHookScene: React.FC = () => <TableShapeStage frame={useCurrentFrame() + TABLE_SHAPE_STARTS.hook} />;
