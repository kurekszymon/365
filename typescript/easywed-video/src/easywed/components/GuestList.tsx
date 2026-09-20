import React from "react";
import { interpolate } from "remotion";
import { Icon, type IconName } from "./Icon";
import type { RosterGuest } from "../data";
import { ageGroupLabel, tl, type DietKey } from "../i18n";
import { colors, fonts } from "../theme";

/**
 * The guest panel's list - `planner/Guests/GuestListContent.tsx` at easywed/v1:
 * search, filter chips, add and import, then one row per guest with the table
 * they sit at, their child age bracket beside the name (`lib/ageGroup.ts`) and
 * their diet tags (`ui/tag-badge`, toned by `lib/dietary`). Strings are
 * `guests.*` from `pl.json` / `en.json`, verbatim.
 *
 * Shared by the kitchen-report cut, which draws diets, and the kids-count cut,
 * which draws brackets; the age props default to the report's list as it
 * shipped.
 *
 * The sticky block opens with the `SeatingProgress` card above the search; the
 * close-up that shows this list frames below it, so it is not drawn.
 *
 * Sizes are the app's CSS pixels; the caller scales the whole list.
 */

/** `DIETARY_PRESETS` order, which the filter row keeps, and each preset's reserved tone. */
const DIETS: { diet: DietKey; tone: string }[] = [
  { diet: "vegetarian", tone: colors.tagGreen },
  { diet: "vegan", tone: colors.tagTeal },
  { diet: "glutenFree", tone: colors.tagAmber },
];

const toneOf = (diet: DietKey) => DIETS.find((entry) => entry.diet === diet)?.tone ?? colors.inkSoft;

/**
 * `isKidAgeGroup` in `lib/ageGroup.ts`: a bracket is judged by its lower bound,
 * so "0-3" and a typed "6-12" count as children and an adult - which is a
 * missing bracket - never does.
 */
const ADULT_AGE = 18;
/** `ADULT_AGE_GROUP` - the implicit default, stored as the bare key like the app stores it. */
export const ADULT_AGE_GROUP = "adult";
export const isKid = (group: string | undefined): boolean => {
  if (!group || group === ADULT_AGE_GROUP) return false;
  const lowerBound = /^(\d{1,2})/.exec(group);
  return lowerBound ? Number(lowerBound[1]) < ADULT_AGE : true;
};

/** `TAG_TONE_BADGE`: the tone's border at 35%, its wash at 10%, its text at full strength. */
const toned = (tone: string): React.CSSProperties => ({
  border: `1px solid ${tone}59`,
  backgroundColor: `${tone}1a`,
  color: tone,
});

/** `bg-primary/10` behind the initials. */
const AVATAR = "rgba(43, 38, 33, 0.1)";

/** Search, chips and buttons with `gap-3` between them, then the list's `gap-4`. */
const SEARCH_HEIGHT = 36;
const CHIPS_HEIGHT = 30;
const BUTTON_HEIGHT = 32;
const STICKY_GAP = 12;
const LIST_GAP = 16;
const ROW_GAP = 8;
/** A row: `p-3` around the 44px avatar, plus its border; the tags add `mt-1` and the 20px badge. */
export const ROW_HEIGHT = 70;
const TAGS_HEIGHT = 24;

/** Where the filter chips start, below the search. */
export const CHIPS_TOP = SEARCH_HEIGHT + STICKY_GAP;
/** Where the first row starts. */
export const LIST_TOP = CHIPS_TOP + CHIPS_HEIGHT + STICKY_GAP + BUTTON_HEIGHT + LIST_GAP;

/** Top edge of row `index`, measured from `LIST_TOP` - where a cursor aims for that row. */
export const rowTop = (guests: RosterGuest[], index: number): number =>
  rowBottom(guests, index) - ROW_HEIGHT - (guests[index]?.diet ? TAGS_HEIGHT : 0);

/** Bottom edge of row `index` once every tag above it has landed, measured from `LIST_TOP`. */
export const rowBottom = (guests: RosterGuest[], index: number): number =>
  guests
    .slice(0, index + 1)
    .reduce((sum, guest, i) => sum + ROW_HEIGHT + (guest.diet ? TAGS_HEIGHT : 0) + (i > 0 ? ROW_GAP : 0), 0);

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");

const Chip: React.FC<{ label: string; style: React.CSSProperties }> = ({ label, style }) => (
  <div
    style={{
      flexShrink: 0,
      height: CHIPS_HEIGHT,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      borderRadius: 999,
      border: "1px solid transparent",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {label}
  </div>
);

const OutlineButton: React.FC<{ icon: IconName; label: string }> = ({ icon, label }) => (
  <div
    style={{
      flex: 1,
      height: BUTTON_HEIGHT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      fontSize: 14,
      fontWeight: 500,
      color: colors.ink,
    }}
  >
    <Icon name={icon} color={colors.ink} size={16} />
    {label}
  </div>
);

type Props = {
  guests: RosterGuest[];
  width: number;
  /** Per-guest entrance of their diet tags, indexed like `guests`; guests without a diet ignore it. */
  tagged: number[];
  /** How far the rows have scrolled under the sticky block, in CSS px. */
  scroll: number;
  /** Height of the list's viewport below the sticky block, in CSS px. */
  listHeight: number;
  /**
   * Per-guest entrance of the age badge, indexed like `guests`; adults ignore
   * it. Left out, every bracket is already on the row - which is how a list
   * with no brackets at all, like the report cut's, renders unchanged.
   */
  aged?: number[];
  /** Which filter chip is pressed. "kids" filters the rows down, as the app does. */
  activeFilter?: "all" | "kids";
};

export const GuestList: React.FC<Props> = ({
  guests,
  width,
  tagged,
  scroll,
  listHeight,
  aged,
  activeFilter = "all",
}) => {
  const landed = (i: number) => Math.min(1, Math.max(0, tagged[i] ?? 0));
  const badged = (i: number) => Math.min(1, Math.max(0, aged?.[i] ?? 1));

  // The kid headcount is derived from the brackets on the list, never typed -
  // `countKids` over the badges that have landed.
  const kidsCount = guests.filter((guest, i) => isKid(guest.ageGroup) && badged(i) >= 0.5).length;
  const kidsShown = Math.max(0, ...guests.map((guest, i) => (isKid(guest.ageGroup) ? badged(i) : 0)));
  const kidsActive = activeFilter === "kids";
  // The app filters `guests` down to the rows that match; the counts above it
  // keep reading the whole list.
  const rows = kidsActive ? guests.filter((guest) => isKid(guest.ageGroup)) : guests;

  // The filter row only offers a diet once someone carries it, counting the tags already on the list.
  const dietChips = DIETS.map(({ diet, tone }) => {
    const carriers = guests.map((guest, i) => (guest.diet === diet ? i : -1)).filter((i) => i >= 0);
    const count = carriers.filter((i) => landed(i) >= 0.5).length;
    const shown = Math.max(0, ...carriers.map(landed));
    return { diet, tone, count, shown };
  });

  return (
    <div style={{ width, fontFamily: fonts.sans, color: colors.ink }}>
      <div
        style={{
          height: SEARCH_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.card,
          fontSize: 14,
          color: colors.inkSoft,
        }}
      >
        <Icon name="search" color={colors.inkSoft} size={16} />
        {tl.guests.search}
      </div>

      <div style={{ marginTop: STICKY_GAP, display: "flex", gap: 8, overflow: "hidden" }}>
        <Chip
          label={tl.guests.filterAll(guests.length)}
          style={
            kidsActive
              ? { backgroundColor: colors.bgDeep, color: colors.inkSoft }
              : { backgroundColor: colors.primary, color: colors.primaryInk }
          }
        />
        <Chip label={tl.guests.filterUnseated(guests.filter((guest) => !guest.table).length)} style={{ backgroundColor: colors.bgDeep, color: colors.inkSoft }} />
        {/* Offered only once someone carries a bracket - `kidsCount > 0 &&` in
            the app - which is why it slides in mid-film rather than sitting at zero. */}
        {kidsShown > 0 ? (
          <div style={{ opacity: kidsShown, transform: `scale(${interpolate(kidsShown, [0, 1], [0.7, 1])})` }}>
            <Chip
              label={tl.guests.filterKids(Math.max(kidsCount, 1))}
              style={
                kidsActive
                  ? { backgroundColor: colors.tagViolet, color: colors.bg }
                  : toned(colors.tagViolet)
              }
            />
          </div>
        ) : null}
        {dietChips.map(({ diet, tone, count, shown }) =>
          shown > 0 ? (
            <div key={diet} style={{ opacity: shown, transform: `scale(${interpolate(shown, [0, 1], [0.7, 1])})` }}>
              <Chip label={`${tl.diet[diet]} (${Math.max(count, 1)})`} style={toned(tone)} />
            </div>
          ) : null,
        )}
      </div>

      <div style={{ marginTop: STICKY_GAP, display: "flex", gap: 8 }}>
        <OutlineButton icon="plus" label={tl.guests.add} />
        <OutlineButton icon="fileSpreadsheet" label={tl.guests.import} />
      </div>

      <div style={{ marginTop: LIST_GAP, height: listHeight, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP, transform: `translateY(${-scroll}px)` }}>
          {rows.map((guest) => {
            const i = guests.indexOf(guest);
            const tag = tagged[i] ?? 0;
            const bracket = isKid(guest.ageGroup) ? guest.ageGroup : undefined;
            const badge = badged(i);
            return (
              <div
                key={guest.name}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  paddingRight: 8,
                  borderRadius: 16,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 999,
                      backgroundColor: AVATAR,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: colors.primary,
                    }}
                  >
                    {initials(guest.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* The bracket rides beside the name, not with the diets:
                        it is who the guest is, not what they eat. */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {guest.name}
                      </div>
                      {bracket ? (
                        <div
                          style={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            height: 20,
                            padding: "0 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            opacity: interpolate(badge, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
                            transform: `scale(${Math.max(badge, 0)})`,
                            transformOrigin: "left center",
                            ...toned(colors.tagViolet),
                          }}
                        >
                          {ageGroupLabel(bracket)}
                        </div>
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        lineHeight: "16px",
                        fontWeight: 500,
                        color: colors.primary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Icon name="check" color={colors.primary} size={12} strokeWidth={2.5} />
                      {tl.guests.seatedAt(guest.table)}
                    </div>
                    {/* The tag row opens as the diet is typed in, pushing the rows below down. */}
                    {guest.diet ? (
                      <div style={{ height: TAGS_HEIGHT * landed(i), overflow: "visible" }}>
                        <div
                          style={{
                            marginTop: 4,
                            display: "inline-flex",
                            alignItems: "center",
                            height: 20,
                            padding: "0 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            opacity: interpolate(tag, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
                            transform: `scale(${Math.max(tag, 0)})`,
                            transformOrigin: "left center",
                            ...toned(toneOf(guest.diet)),
                          }}
                        >
                          {tl.diet[guest.diet]}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {(["tables", "pencil", "trash"] as const).map((icon) => (
                  <div
                    key={icon}
                    style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Icon name={icon} color={colors.inkSoft} size={16} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
