import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { guestColumnRect, PRINT_PAGE, PrintPage, printPages } from "../../components/PrintSheet";
import { useFormat } from "../../format";
import { guestListFor } from "../guests";

/** The report's pages land one on another: the cover, the hall, the guest list. */
const PAGE_FROM = [0, 30, 56];

/** Then the shot pushes in on the guest list's first column, and holds there to be read. */
const PUSH_FROM = 82;
const PUSH_OVER = 28;

/** Width of a column kept in shot - its longest printed line, not its empty right half. */
const LINE_WIDTH = 330;

type Place = { x: number; y: number; rotate: number };

/**
 * Page centres relative to the frame's centre. Portrait stacks the pages down
 * the frame, so the cover's headcount stays in view; landscape fans them
 * across it. The guest page lies square, since the shot pushes in on it:
 * portrait on the left column, landscape wide enough for both, so neither cut
 * leaves a column sliced at the frame's edge.
 */
const LAYOUT: Record<
  "wide" | "tall",
  {
    pageWidth: number;
    places: [Place, Place, Place];
    margin: { x: number; y: number };
    columns: number;
    groups: number;
  }
> = {
  wide: {
    pageWidth: 1000,
    places: [
      { x: -340, y: -70, rotate: -4 },
      { x: 0, y: 0, rotate: 1.5 },
      { x: 340, y: 70, rotate: 0 },
    ],
    margin: { x: 140, y: 90 },
    columns: 2,
    groups: 2,
  },
  tall: {
    pageWidth: 960,
    places: [
      { x: 0, y: -520, rotate: -2.5 },
      { x: 0, y: 40, rotate: 2 },
      { x: 0, y: 420, rotate: 0 },
    ],
    margin: { x: 80, y: 150 },
    columns: 1,
    groups: 3,
  },
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ReportSheetScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const guests = guestListFor(hall);
  const pages = printPages(hall, guests);

  const pageScale = layout.pageWidth / PRINT_PAGE.width;
  const pageHeight = PRINT_PAGE.height * pageScale;
  const shown = pages.slice(0, 3);
  const topLeft = (place: Place) => ({
    x: frameWidth / 2 + place.x - layout.pageWidth / 2,
    y: frameHeight / 2 + place.y - pageHeight / 2,
  });

  // The push: fit the first tables of the guest page's columns into the
  // frame's margins, zooming geometrically so the move doesn't rush at the end.
  const guestPage = pages[2];
  if (guestPage.kind !== "guests") throw new Error("The report's third page is its guest list.");
  const first = guestColumnRect(guestPage, 0, layout.groups);
  const last = guestColumnRect(guestPage, layout.columns - 1, layout.groups);
  const origin = topLeft(layout.places[2]);
  const region = {
    x: origin.x + first.x * pageScale,
    y: origin.y + first.y * pageScale,
    width: (last.x - first.x + Math.min(last.width, LINE_WIDTH)) * pageScale,
    height: Math.max(first.height, last.height) * pageScale,
  };
  const zoomTo = Math.min(
    (frameWidth - layout.margin.x * 2) / region.width,
    (frameHeight - layout.margin.y * 2) / region.height,
  );
  const push = interpolate(frame, [PUSH_FROM, PUSH_FROM + PUSH_OVER], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const zoom = Math.exp(push * Math.log(zoomTo));
  const regionCentre = { x: region.x + region.width / 2, y: region.y + region.height / 2 };
  const focus = {
    x: interpolate(push, [0, 1], [regionCentre.x, frameWidth / 2]),
    y: interpolate(push, [0, 1], [regionCentre.y, frameHeight / 2]),
  };
  const shift = { x: focus.x - zoom * regionCentre.x, y: focus.y - zoom * regionCentre.y };

  return (
    <Backdrop>
      <AbsoluteFill style={{ transform: `translate(${shift.x}px, ${shift.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
        {shown.map((page, i) => {
          const place = layout.places[i];
          const at = topLeft(place);
          const enter = spring({ frame: frame - PAGE_FROM[i], fps, config: { damping: 16, mass: 0.7 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: at.x,
                top: at.y,
                opacity: interpolate(enter, [0, 0.3], [0, 1], clamp),
                transform: `translateY(${interpolate(enter, [0, 1], [160, 0])}px) rotate(${place.rotate + (1 - enter) * 5}deg)`,
              }}
            >
              <PrintPage page={page} hall={hall} guests={guests} scale={pageScale} />
            </div>
          );
        })}
      </AbsoluteFill>
    </Backdrop>
  );
};
