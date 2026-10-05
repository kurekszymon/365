import React from "react";
import { useCurrentFrame } from "remotion";
import { TryNowStage } from "../components/TryNowStage";
import { TRY_NOW_STARTS } from "../timeline";

/**
 * *Dodaj gościa*, her name typed at a thumb's pace and saved; the table's form,
 * scrolled to *Przypisz gości*, and her row picked; the check - the table at
 * `1 / 8`, the card done, the stopwatch stopped - and the payoff.
 */
export const TryNowSeatScene: React.FC = () => <TryNowStage frame={useCurrentFrame() + TRY_NOW_STARTS.seat} />;
