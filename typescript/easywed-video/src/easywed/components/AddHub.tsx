import React from "react";
import { tl } from "../i18n";
import { colors, fonts } from "../theme";
import { Icon, type IconName } from "./Icon";

/**
 * `EntityForms/AddHubContent.tsx` at easywed/v1 - the *Dodaj do sali* picker's
 * body, shared by the desktop `Sidebar/AddEntityDialog` and the phone's
 * add-hub sheet: the `hall.add_hub.hint` line, the *Stoły* / *Elementy sali*
 * button group, and a three-column grid of `AddCard`s. With one hall on the
 * plan the hall select is not rendered, so it is not drawn here either.
 *
 * Sizes are the app's CSS pixels times `scale`.
 */

export type AddHubCategory = "tables" | "fixtures";

/** `TABLE_PRESETS` in `addPresets.ts`: the swatch each card previews. */
export const TABLE_PRESETS = [
  { key: "round-8", label: tl.app.addHub.tables.round8, preview: "round" },
  { key: "rect-6", label: tl.app.addHub.tables.rect6, preview: "rect" },
  { key: "oval-10", label: tl.app.addHub.tables.oval10, preview: "oval" },
] as const;

/** `FIXTURE_PRESETS` in `addPresets.ts`, in its order, with `FIXTURE_ICONS`' glyphs and each preset's size in metres. */
export const FIXTURE_PRESETS = [
  { key: "stage", label: tl.app.addHub.fixtures.stage, icon: "presentation", size: { width: 3, height: 1.5 } },
  { key: "dance-floor", label: tl.app.addHub.fixtures.danceFloor, icon: "music2", size: { width: 3, height: 3 } },
  { key: "bar", label: tl.app.addHub.fixtures.bar, icon: "martini", size: { width: 2.5, height: 1 } },
  { key: "dj-booth", label: tl.app.addHub.fixtures.djBooth, icon: "disc3", size: { width: 1.5, height: 1 } },
  { key: "entrance", label: tl.app.addHub.fixtures.entrance, icon: "logIn", size: { width: 1, height: 0.3 } },
  { key: "custom", label: tl.app.addHub.fixtures.custom, icon: "shapes", size: { width: 1.5, height: 1.5 } },
] as const satisfies readonly { key: string; label: string; icon: IconName; size: { width: number; height: number } }[];

export type FixturePresetKey = (typeof FIXTURE_PRESETS)[number]["key"];

/** The hint's `text-xs` line, the `sm` button group's `h-7`, and the body's `gap-4`. */
const HINT = 16;
const GROUP = 28;
const GAP = 16;
/** `grid-cols-3 gap-2.5`; an `AddCard` is `p-4` round a `size-11` preview, `gap-2.5`, and an 11.5 px label. */
const GRID_GAP = 10;
const CARD_PAD = 16;
const PREVIEW = 44;
const LABEL = 16;
const CARD_HEIGHT = CARD_PAD * 2 + PREVIEW + 10 + LABEL;

const GRID_TOP = HINT + GAP + GROUP + GAP;

/** The body's height at CSS px, for a dialog or sheet sizing itself round it. */
export const ADD_HUB_HEIGHT = GRID_TOP + CARD_HEIGHT * 2 + GRID_GAP;

/** A card's centre from the body's top-left, in CSS px - what a pointer or a thumb aims at. */
export const addHubCardCenter = (width: number, index: number) => {
  const cardWidth = (width - GRID_GAP * 2) / 3;
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: col * (cardWidth + GRID_GAP) + cardWidth / 2,
    y: GRID_TOP + row * (CARD_HEIGHT + GRID_GAP) + CARD_HEIGHT / 2,
  };
};

const TableSwatch: React.FC<{ preview: "round" | "rect" | "oval"; scale: number }> = ({ preview, scale }) => (
  <div
    style={{
      width: (preview === "round" ? 44 : 56) * scale,
      height: (preview === "round" ? 44 : 32) * scale,
      borderRadius: preview === "rect" ? 6 * scale : 999,
      border: `${2 * scale}px solid ${colors.tableBorder}`,
      backgroundColor: colors.table,
      boxSizing: "border-box",
    }}
  />
);

export const AddHub: React.FC<{
  category: AddHubCategory;
  /** The body's width, CSS px. */
  width: number;
  scale: number;
  /** The card under the pointer (`hover:bg-accent/50`), by preset key. */
  hovered?: string;
}> = ({ category, width, scale, hovered }) => {
  const tab = (label: string, on: boolean) => (
    <div
      style={{
        flex: 1,
        height: GROUP * scale,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${on ? colors.primary : colors.border}`,
        backgroundColor: on ? colors.primary : colors.secondary,
        color: on ? colors.primaryInk : colors.ink,
        fontSize: 12.8 * scale,
        fontWeight: 500,
        boxSizing: "border-box",
      }}
    >
      {label}
    </div>
  );

  const cards =
    category === "tables"
      ? TABLE_PRESETS.map((preset) => ({
          key: preset.key,
          label: preset.label,
          preview: <TableSwatch preview={preset.preview} scale={scale} />,
        }))
      : FIXTURE_PRESETS.map((preset) => ({
          key: preset.key,
          label: preset.label,
          preview: (
            <div
              style={{
                width: PREVIEW * scale,
                height: PREVIEW * scale,
                borderRadius: 8 * scale,
                backgroundColor: colors.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={preset.icon} color={colors.inkSoft} size={20 * scale} />
            </div>
          ),
        }));

  const cardWidth = (width - GRID_GAP * 2) / 3;

  return (
    <div style={{ width: width * scale, fontFamily: fonts.sans, color: colors.ink }}>
      <div style={{ height: HINT * scale, display: "flex", alignItems: "center", fontSize: 12 * scale, color: colors.inkSoft }}>
        {tl.app.addHub.hint}
      </div>
      <div
        style={{
          marginTop: GAP * scale,
          display: "flex",
          borderRadius: 10 * scale,
          overflow: "hidden",
        }}
      >
        {tab(tl.app.addHub.tablesTab, category === "tables")}
        {tab(tl.app.addHub.fixturesTab, category === "fixtures")}
      </div>
      <div
        style={{
          marginTop: GAP * scale,
          display: "grid",
          gridTemplateColumns: `repeat(3, ${cardWidth * scale}px)`,
          gap: GRID_GAP * scale,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.key}
            style={{
              height: CARD_HEIGHT * scale,
              boxSizing: "border-box",
              padding: CARD_PAD * scale,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10 * scale,
              borderRadius: 16 * scale,
              border: `1px solid ${colors.border}`,
              // `hover:bg-accent/50`.
              backgroundColor: hovered === card.key ? "rgba(241, 222, 238, 0.5)" : "transparent",
            }}
          >
            {card.preview}
            <div style={{ height: LABEL * scale, display: "flex", alignItems: "center", fontSize: 11.5 * scale, fontWeight: 600 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
