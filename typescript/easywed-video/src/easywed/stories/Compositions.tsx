import React from "react";
import { Composition, Folder } from "remotion";
import { FPS, VERTICAL_HEIGHT, VERTICAL_WIDTH } from "../timeline";
import { KeepApart } from "./keep-apart/KeepApart";
import { ApartHookScene } from "./keep-apart/scenes/ApartHookScene";
import { ApartParentsScene } from "./keep-apart/scenes/ApartParentsScene";
import { ApartUncleScene } from "./keep-apart/scenes/ApartUncleScene";
import { ApartCtaScene } from "./keep-apart/scenes/ApartCtaScene";
import { KEEP_APART_DURATION, KEEP_APART_SCENES } from "./keep-apart/timeline";
import { MamaLink } from "./mama-link/MamaLink";
import { MamaHookScene } from "./mama-link/scenes/MamaHookScene";
import { MamaInviteScene } from "./mama-link/scenes/MamaInviteScene";
import { MamaPhoneScene } from "./mama-link/scenes/MamaPhoneScene";
import { MamaCtaScene } from "./mama-link/scenes/MamaCtaScene";
import { MAMA_DURATION, MAMA_SCENES } from "./mama-link/timeline";
import { SundayCouch } from "./sunday-couch/SundayCouch";
import { CouchHookScene } from "./sunday-couch/scenes/CouchHookScene";
import { CouchHallScene } from "./sunday-couch/scenes/CouchHallScene";
import { CouchSeatingScene } from "./sunday-couch/scenes/CouchSeatingScene";
import { CouchDoneScene } from "./sunday-couch/scenes/CouchDoneScene";
import { CouchCtaScene } from "./sunday-couch/scenes/CouchCtaScene";
import {
  SUNDAY_COUCH_DURATION,
  SUNDAY_COUCH_SCENES,
} from "./sunday-couch/timeline";
import { CiocieSingle } from "./ciocie-single/CiocieSingle";
import { CiocieHookScene } from "./ciocie-single/scenes/CiocieHookScene";
import { CiocieSingleScene } from "./ciocie-single/scenes/CiocieSingleScene";
import { CiocieAuntsScene } from "./ciocie-single/scenes/CiocieAuntsScene";
import { CiocieCtaScene } from "./ciocie-single/scenes/CiocieCtaScene";
import { CIOCIE_DURATION, CIOCIE_SCENES } from "./ciocie-single/timeline";

/** The 9:16 story cuts - keep-apart, mama-link, sunday-couch, ciocie-single - with their beats. */
export const StoriesCompositions: React.FC = () => {
  return (
    <>
      {/* The 17 s keep-apart cut - Stół 6 taken away from the DJ, then a family table
      dragged across the dance floor with its guests; 9:16 only, the unsuffixed
      id left free for a 16:9 loop. */}
      <Composition
        id="easywed-apart-vertical"
        component={KeepApart}
        durationInFrames={KEEP_APART_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 18 s mama-link cut - mum's questions, a view-only link made on the laptop,
      mum finding the uncle on her own phone; 9:16 only. */}
      <Composition
        id="easywed-mama-vertical"
        component={MamaLink}
        durationInFrames={MAMA_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 22.7 s sunday-couch cut - one evening on one laptop, the empty hall at
      19:40 to everyone seated at 22:30, told by a clock and two voices; 9:16 only. */}
      <Composition
        id="easywed-couch-vertical"
        component={SundayCouch}
        durationInFrames={SUNDAY_COUCH_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The 16 s ciocie-single cut - Stół 2 renamed *Single*, Stół 5 *Ciocie*, the dance
      floor already between them; 9:16 only, the unsuffixed id left free for a 16:9 loop. */}
      <Composition
        id="easywed-ciocie-vertical"
        component={CiocieSingle}
        durationInFrames={CIOCIE_DURATION}
        fps={FPS}
        width={VERTICAL_WIDTH}
        height={VERTICAL_HEIGHT}
      />

      {/* The keep-apart cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Keep-apart">
        <Composition
          id="ApartHook"
          component={ApartHookScene}
          durationInFrames={KEEP_APART_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ApartUncle"
          component={ApartUncleScene}
          durationInFrames={KEEP_APART_SCENES.uncle}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ApartParents"
          component={ApartParentsScene}
          durationInFrames={KEEP_APART_SCENES.parents}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="ApartCta"
          component={ApartCtaScene}
          durationInFrames={KEEP_APART_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The mama-link cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Mama-link">
        <Composition
          id="MamaHook"
          component={MamaHookScene}
          durationInFrames={MAMA_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="MamaInvite"
          component={MamaInviteScene}
          durationInFrames={MAMA_SCENES.invite}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="MamaPhone"
          component={MamaPhoneScene}
          durationInFrames={MAMA_SCENES.phone}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="MamaCta"
          component={MamaCtaScene}
          durationInFrames={MAMA_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The sunday-couch cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Sunday-couch">
        <Composition
          id="CouchHook"
          component={CouchHookScene}
          durationInFrames={SUNDAY_COUCH_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CouchHall"
          component={CouchHallScene}
          durationInFrames={SUNDAY_COUCH_SCENES.hall}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CouchSeating"
          component={CouchSeatingScene}
          durationInFrames={SUNDAY_COUCH_SCENES.seating}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CouchDone"
          component={CouchDoneScene}
          durationInFrames={SUNDAY_COUCH_SCENES.done}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CouchCta"
          component={CouchCtaScene}
          durationInFrames={SUNDAY_COUCH_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>

      {/* The ciocie-single cut's beats, at 9:16 - the only size it is made for. */}
      <Folder name="Ciocie-single">
        <Composition
          id="CiocieHook"
          component={CiocieHookScene}
          durationInFrames={CIOCIE_SCENES.hook}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CiocieSingle"
          component={CiocieSingleScene}
          durationInFrames={CIOCIE_SCENES.single}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CiocieAunts"
          component={CiocieAuntsScene}
          durationInFrames={CIOCIE_SCENES.ciocie}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
        <Composition
          id="CiocieCta"
          component={CiocieCtaScene}
          durationInFrames={CIOCIE_SCENES.cta}
          fps={FPS}
          width={VERTICAL_WIDTH}
          height={VERTICAL_HEIGHT}
        />
      </Folder>
    </>
  );
};
