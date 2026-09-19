import React from "react";
import { Icon, type IconName } from "./Icon";
import type { Point } from "../geometry";
import { tl } from "../i18n";
import { colors, fonts } from "../theme";

/**
 * Redraws the desktop hall settings: `Sidebar/EntityEditDialog` - a centred
 * modal, not a side panel, at v1 - around `EntityForms/HallPanelContent`. The
 * title (`hall`) beside the black check that closes it, then the form top to
 * bottom: name, floor, the four-button shape group, the polygon hint and
 * *Edytuj obrys* once the hall has an outline, size, position, grid spacing,
 * grid style and the delete button.
 *
 * Drawn in the app's own CSS pixels - `DialogContent`'s `sm:max-w-md`, `p-4`
 * and `gap-4`, `h-8` inputs, `size="xs"` button groups - and scaled as a whole
 * by the caller, so the layout arithmetic below is the app's.
 */
export const HALL_PANEL = {
  width: 448,
  pad: 16,
  gap: 16,
  header: 36,
  label: 20,
  labelGap: 8,
  input: 32,
  group: 24,
  hint: 16,
  button: 32,
  /** `Label` in `DimensionsRectangle`: `leading-none`, then `gap-1`. */
  smallLabel: 14,
  smallGap: 4,
  radius: 12,
};

const P = HALL_PANEL;
const field = P.label + P.labelGap + P.input;
const groupField = P.label + P.labelGap + P.group;
const smallField = P.smallLabel + P.smallGap + P.input;

/** Where the shape group's buttons sit, from the dialog's top edge. */
const SHAPE_GROUP_TOP = P.pad + P.header + P.gap + field + P.gap + field + P.gap + P.label + P.labelGap;

/** The dialog's height; it grows by the hint and the button once the hall has an outline. */
export const hallPanelHeight = (lShape: boolean): number =>
  P.pad * 2 +
  P.header +
  P.gap +
  [
    field,
    field,
    groupField,
    ...(lShape ? [P.hint, P.button] : []),
    smallField,
    P.label + P.labelGap + smallField,
    groupField,
    groupField,
    P.button,
  ].reduce((sum, h) => sum + h + P.gap, -P.gap);

/** The centres the pointer aims at, in the dialog's own unscaled pixels. */
export const hallPanelTargets = (
  lShape: boolean,
): { lShape: Point; editOutline: Point; floor: Point; done: Point } => {
  const inner = P.width - P.pad * 2;
  // `flex-1` on four buttons: equal quarters of the group.
  const quarter = inner / 4;
  const editTop = SHAPE_GROUP_TOP + P.group + P.gap + P.hint + P.gap;
  return {
    lShape: { x: P.pad + quarter * 1.5, y: SHAPE_GROUP_TOP + P.group / 2 },
    editOutline: { x: P.width / 2, y: lShape ? editTop + P.button / 2 : Number.NaN },
    floor: { x: P.width / 2, y: P.pad + P.header + P.gap + field + P.gap + P.label + P.labelGap + P.input / 2 },
    done: { x: P.width - P.pad - P.header / 2, y: P.pad + P.header / 2 },
  };
};

const Label: React.FC<{ children: React.ReactNode; small?: boolean }> = ({ children, small }) => (
  <div
    style={{
      height: small ? P.smallLabel : P.label,
      display: "flex",
      alignItems: "center",
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1,
      color: colors.ink,
    }}
  >
    {children}
  </div>
);

/** `Input`'s `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`. */
const FOCUS_RING = "0 0 0 3px rgba(123, 115, 107, 0.35)";

const Input: React.FC<{ value?: string; placeholder?: string; focused?: boolean }> = ({
  value,
  placeholder,
  focused,
}) => (
  <div
    style={{
      height: P.input,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      padding: "0 10px",
      borderRadius: 10,
      border: `1px solid ${focused ? colors.inkSoft : colors.border}`,
      boxShadow: focused ? FOCUS_RING : undefined,
      fontSize: 14,
      color: value ? colors.ink : colors.inkSoft,
    }}
  >
    {value || placeholder}
    {focused ? <div style={{ width: 1, height: 16, marginLeft: 1, backgroundColor: colors.ink }} /> : null}
  </div>
);

/** A `ButtonGroup` of `size="xs"` buttons, the chosen one `variant="default"`, the rest `outline`. */
const Group: React.FC<{ options: string[]; chosen: number }> = ({ options, chosen }) => (
  <div style={{ display: "flex", height: P.group }}>
    {options.map((option, i) => {
      const on = i === chosen;
      return (
        <div
          key={option}
          style={{
            // `flex-1` keeps the browser's `min-width: auto`, so a long label
            // widens its own button and the rest share what is left.
            flex: 1,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px",
            border: `1px solid ${on ? colors.primary : colors.border}`,
            borderLeftWidth: i === 0 ? 1 : 0,
            borderRadius: i === 0 ? "8px 0 0 8px" : i === options.length - 1 ? "0 8px 8px 0" : 0,
            backgroundColor: on ? colors.primary : colors.secondary,
            color: on ? colors.primaryInk : colors.ink,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {option}
        </div>
      );
    })}
  </div>
);

/** An `outline` button at the default `h-8`, full width in the form's column. */
const OutlineButton: React.FC<{ icon: IconName; label: string; tint?: string }> = ({
  icon,
  label,
  tint = colors.ink,
}) => (
  <div
    style={{
      height: P.button,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.secondary,
      fontSize: 14,
      fontWeight: 500,
      color: tint,
    }}
  >
    <Icon name={icon} color={tint} size={16} />
    {label}
  </div>
);

const Field: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: P.labelGap }}>{children}</div>
);

const SmallField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: P.smallGap }}>
    <Label small>{label}</Label>
    <Input value={value} />
  </div>
);

const d = tl.app.hallDialog;

/** `NICE_INTERVALS` in the app's `Canvas/utils.ts`, the grid spacings on offer. */
const NICE_INTERVALS = [1, 2, 5, 10, 25, 50];

export const HallPanel: React.FC<{
  /** Empty for a hall added without a name: the field then shows its placeholder. */
  hallName: string;
  meters: { width: number; height: number };
  lShape: boolean;
  /** What is typed into *Piętro* - left out, the field shows its placeholder. */
  floor?: string;
  /** *Piętro* has the caret, with the input's focus ring. */
  floorFocused?: boolean;
  /** `hall.position` in metres; a first hall sits at the world origin. */
  position?: { x: number; y: number };
}> = ({ hallName, meters, lShape, floor, floorFocused, position = { x: 0, y: 0 } }) => (
  <div
    style={{
      width: P.width,
      height: hallPanelHeight(lShape),
      boxSizing: "border-box",
      padding: P.pad,
      display: "flex",
      flexDirection: "column",
      gap: P.gap,
      borderRadius: P.radius,
      backgroundColor: colors.bg,
      // `ring-1 ring-foreground/10`, plus the lift a modal carries.
      boxShadow: "0 0 0 1px rgba(36, 31, 26, 0.1), 0 24px 60px rgba(60, 50, 40, 0.18)",
      fontFamily: fonts.sans,
      overflow: "hidden",
    }}
  >
    <div style={{ height: P.header, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 500, color: colors.ink }}>{d.title}</div>
      <div
        style={{
          width: P.header,
          height: P.header,
          borderRadius: 999,
          backgroundColor: colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" color={colors.primaryInk} size={20} />
      </div>
    </div>

    <Field>
      <Label>{d.name}</Label>
      <Input value={hallName} placeholder={d.namePlaceholder} />
    </Field>

    <Field>
      <Label>{d.floor}</Label>
      <Input value={floor} placeholder={d.floorPlaceholder} focused={floorFocused} />
    </Field>

    <Field>
      <Label>{d.shape}</Label>
      <Group
        options={[d.preset.rectangle, d.preset.lShape, d.preset.uShape, d.preset.custom]}
        chosen={lShape ? 1 : 0}
      />
    </Field>

    {lShape ? (
      <>
        <div style={{ height: P.hint, fontSize: 12, lineHeight: `${P.hint}px`, color: colors.inkSoft }}>
          {d.polygonHint}
        </div>
        <OutlineButton icon="pencilRuler" label={d.editOutline} />
      </>
    ) : null}

    <div style={{ display: "flex", gap: 8 }}>
      <SmallField label={d.width} value={String(meters.width)} />
      <SmallField label={d.height} value={String(meters.height)} />
    </div>

    <Field>
      <Label>{d.position}</Label>
      {/* A first hall starts at the world origin (`localWedding.ts`, `mutations/hall.ts`); a later one where `nextHallPosition` puts it. */}
      <div style={{ display: "flex", gap: 8 }}>
        <SmallField label="X" value={String(position.x)} />
        <SmallField label="Y" value={String(position.y)} />
      </div>
    </Field>

    <Field>
      <Label>{d.gridSpacing}</Label>
      {/* `validSpacings`: every nice interval under the hall's longer side, then auto; 1 m is the default. */}
      <Group
        options={[
          ...NICE_INTERVALS.filter((n) => n < Math.max(meters.width, meters.height)).map((n) => `${n} m`),
          d.auto,
        ]}
        chosen={0}
      />
    </Field>

    <Field>
      <Label>{d.gridStyle}</Label>
      <Group options={[d.gridStyles.grid, d.gridStyles.dots, d.gridStyles.off]} chosen={0} />
    </Field>

    <OutlineButton icon="trash" label={d.delete} tint={colors.destructive} />
  </div>
);
