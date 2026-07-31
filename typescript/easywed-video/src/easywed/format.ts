import { useVideoConfig } from "remotion";
import type { HallLayout } from "./layouts";
import { TALL_HALL, WIDE_HALL } from "./layouts";

export type Format = {
  /** True for the 9:16 cut. */
  tall: boolean;
  hall: HallLayout;
  /** Type scale, so a scene reads the same at both aspect ratios. */
  type: {
    step: number;
    title: number;
    subtitle: number;
    subtitleWidth: number;
    stat: number;
    body: number;
  };
  pad: number;
  gap: number;
};

/**
 * Both cuts render the same scene components; orientation is derived from the
 * composition rather than plumbed through as props, so `Root.tsx` only has to
 * register a second size.
 */
export const useFormat = (): Format => {
  const { width, height } = useVideoConfig();
  const tall = height > width;

  return {
    tall,
    hall: tall ? TALL_HALL : WIDE_HALL,
    type: tall
      ? { step: 24, title: 76, subtitle: 32, subtitleWidth: 900, stat: 60, body: 30 }
      : { step: 22, title: 62, subtitle: 26, subtitleWidth: 520, stat: 52, body: 25 },
    pad: tall ? 36 : 44,
    gap: tall ? 28 : 40,
  };
};
