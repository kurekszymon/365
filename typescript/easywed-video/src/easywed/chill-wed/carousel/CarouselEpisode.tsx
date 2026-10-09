import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { VERTICAL_HEIGHT, VERTICAL_WIDTH } from "../../timeline";

export type CarouselEpisodeProps = {
  /** A finished 9:16 render, copied into `public/carousel/` by its render script. */
  file: string;
};

/**
 * One slide of the series' IG carousel, which crops anything taller than 4:5.
 * It plays the episode's **rendered** 9:16 cut, scaled to the slide's height,
 * rather than mounting its scenes: those read `useFormat()`, which would lay
 * them out for 1350 px instead of the 1920 they were tuned at. The side bands
 * are the films' own backdrop, so the slide reads as part of the set.
 */
export const CarouselEpisode: React.FC<CarouselEpisodeProps> = ({ file }) => (
  <Backdrop>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          height: "100%",
          aspectRatio: `${VERTICAL_WIDTH} / ${VERTICAL_HEIGHT}`,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(40, 52, 40, 0.14)",
        }}
      >
        <OffthreadVideo
          src={staticFile(`carousel/${file}`)}
          muted
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    </AbsoluteFill>
  </Backdrop>
);
