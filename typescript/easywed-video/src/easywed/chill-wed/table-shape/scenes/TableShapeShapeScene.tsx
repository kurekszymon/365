import React from "react";
import { useCurrentFrame } from "remotion";
import { TableShapeStage } from "../components/TableShapeStage";
import { TABLE_SHAPE_STARTS } from "../timeline";

/**
 * *Prostokątny*: the table turns square at the same 1.5 m; then 3 typed into
 * *Szerokość* and 1 into *Wysokość*, the diagram stretching into a long table,
 * four chairs a side, the initials going with them.
 */
export const TableShapeShapeScene: React.FC = () => <TableShapeStage frame={useCurrentFrame() + TABLE_SHAPE_STARTS.shape} />;
