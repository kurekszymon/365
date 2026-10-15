import "./index.css";
import React from "react";
import { ShowcaseCompositions } from "./easywed/showcase/Compositions";
import { FeaturesCompositions } from "./easywed/features/Compositions";
import { StoriesCompositions } from "./easywed/stories/Compositions";
import { ChillWedCompositions } from "./easywed/chill-wed/Compositions";
import { LandingLoopsCompositions } from "./easywed/landing-loops/Compositions";
import { AnimationsCompositions } from "./easywed/animations/Compositions";

// Composition ids are the brand as it is written everywhere else - lowercase,
// never "Easywed" - and ids can't hold the trailing dot. Each group registers
// its own films in `easywed/<group>/Compositions.tsx`.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <ShowcaseCompositions />
      <FeaturesCompositions />
      <StoriesCompositions />
      <ChillWedCompositions />
      <LandingLoopsCompositions />
      <AnimationsCompositions />
    </>
  );
};
