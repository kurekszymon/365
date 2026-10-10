import React from "react";
import { useCurrentFrame } from "remotion";
import { TableShapeStage } from "../components/TableShapeStage";
import { TABLE_SHAPE_STARTS } from "../timeline";

/**
 * *Obróć o 90°*: the long table stands upright, its width and height swapped.
 * The form is done, the drawer drops onto the plan - the long table along the
 * wall beside the round ones - and the payoff lands.
 */
export const TableShapeTurnScene: React.FC = () => <TableShapeStage frame={useCurrentFrame() + TABLE_SHAPE_STARTS.turn} />;
