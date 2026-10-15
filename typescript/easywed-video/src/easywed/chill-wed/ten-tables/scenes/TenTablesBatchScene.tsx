import React from "react";
import { useCurrentFrame } from "remotion";
import { TenTablesStage } from "../components/TenTablesStage";
import { TEN_TABLES_STARTS } from "../timeline";

/**
 * *Dodaj stoły*: *Okrągły*, *Średnica* typed to 1.5, *Ile* to 10, and the
 * button reading *Dodaj 10 stołów*. A jump cut on the click, onto the room,
 * the ten tables landing in two rows of five.
 */
export const TenTablesBatchScene: React.FC = () => <TenTablesStage frame={useCurrentFrame() + TEN_TABLES_STARTS.batch} />;
