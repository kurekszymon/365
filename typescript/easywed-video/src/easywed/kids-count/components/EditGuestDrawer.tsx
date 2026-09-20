import React from "react";
import { interpolate } from "remotion";
import { Cursor } from "../../components/Cursor";
import { Icon } from "../../components/Icon";
import { ageGroupLabel, tl } from "../../i18n";
import { colors, fonts, shadow } from "../../theme";

/**
 * The edit-guest form - `dialogs/guests/EditGuestDialog.tsx` at easywed/v1 with
 * `GuestFormFields` and `GuestAgeGroupField`. A centred dialog in landscape; in
 * portrait the bottom-sheet drawer `ResponsiveDialog` swaps to on a phone, the
 * way `ImportDialog` draws the import wizard.
 *
 * The four fields are in the app's order - name, dietary, age group, note -
 * then `common.save`. Every string is `guests.*` / `common.save` from
 * `pl.json` / `en.json`, verbatim.
 *
 * Sizes are the app's CSS pixels times `scale`, as `AppFrame` draws the chrome.
 */

/** Dialog size against its CSS spec - bigger in portrait, where it is the whole screen. */
export const drawerScale = (tall: boolean): number => (tall ? 2 : 1.8);

/** `AGE_GROUP_PRESETS` - the brackets the form offers out of the box, in `sortAgeGroups` order. */
export const AGE_GROUP_PRESETS = ["adult", "0-3", "3-6"];

/** `DIETARY_PRESETS`, drawn unselected: nobody on this list has typed a diet. */
const DIETARY_PRESETS = [tl.diet.vegetarian, tl.diet.vegan, tl.diet.glutenFree];

/** `ring-foreground/10` around the dialog. */
const RING = "rgba(36, 31, 26, 0.1)";

/** Where a pointer starts, relative to where it rests, in CSS px - always from above. */
const POINTER_FROM = { x: 130, y: -210 };

/**
 * Where on its target a pointer comes to rest. A pill takes it near its middle;
 * `Zapisz` is the sheet's last element, so its pointer rests near the button's
 * top left and the arrow still has the button under it rather than the frame's edge.
 */
const POINTER_AT = { pill: { left: "62%", top: "56%" }, save: { left: "14%", top: "16%" } };

/** An age pill is addressed by its bracket; the rest of the form by name. */
export type DrawerTarget = string;

export type DrawerPointer = {
  target: DrawerTarget;
  /** 0 = off at its starting point, 1 = resting on the target. */
  approach: number;
  pressed?: boolean;
};

const PointerOverlay: React.FC<{ pointer: DrawerPointer; scale: number }> = ({ pointer, scale }) => {
  const away = 1 - pointer.approach;
  const at = pointer.target === "save" ? POINTER_AT.save : POINTER_AT.pill;
  return (
    <div
      style={{
        position: "absolute",
        ...at,
        zIndex: 10,
        transform: `translate(${POINTER_FROM.x * scale * away}px, ${POINTER_FROM.y * scale * away}px)`,
      }}
    >
      <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`scale(${scale * 1.1})`}>
          <Cursor x={0} y={0} opacity={1} pressed={pointer.pressed} />
        </g>
      </svg>
    </div>
  );
};

/** `Field`: a label over its content, `gap-2`. */
const Field: React.FC<{ label: string; scale: number; children: React.ReactNode }> = ({ label, scale, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 * scale }}>
    <div style={{ fontSize: 14 * scale, fontWeight: 500, color: colors.ink }}>{label}</div>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 * scale }}>{children}</div>
  </div>
);

/** `Input`: a bordered field, showing either its value or its placeholder. */
const TextField: React.FC<{ value?: string; placeholder: string; scale: number }> = ({
  value,
  placeholder,
  scale,
}) => (
  <div
    style={{
      width: "100%",
      height: 32 * scale,
      display: "flex",
      alignItems: "center",
      padding: `0 ${10 * scale}px`,
      borderRadius: 8 * scale,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.card,
      fontSize: 14 * scale,
      color: value ? colors.ink : colors.inkSoft,
    }}
  >
    {value || placeholder}
  </div>
);

/** `Button` at its default size: `h-8`, `text-sm`, rounded-full where the form asks for a pill. */
const Pill: React.FC<{
  label: string;
  scale: number;
  tone: "outline" | "primary" | "age";
  children?: React.ReactNode;
}> = ({ label, scale, tone, children }) => (
  <div
    style={{
      position: "relative",
      height: 32 * scale,
      display: "inline-flex",
      alignItems: "center",
      gap: 4 * scale,
      padding: `0 ${12 * scale}px`,
      borderRadius: 999,
      border: `1px solid ${tone === "outline" ? colors.border : "transparent"}`,
      backgroundColor:
        tone === "primary" ? colors.primary : tone === "age" ? colors.tagViolet : colors.secondary,
      color: tone === "outline" ? colors.ink : tone === "primary" ? colors.primaryInk : colors.bg,
      fontSize: 14 * scale,
      fontWeight: 500,
      whiteSpace: "nowrap",
    }}
  >
    {label}
    {children}
  </div>
);

type Props = {
  /** Portrait's bottom sheet rather than the centred dialog. */
  drawer: boolean;
  scale: number;
  /** The guest being edited - the form's name field, and its title's subject. */
  name: string;
  /** Every bracket the row offers, presets first, as `sortAgeGroups` orders them. */
  options: string[];
  /** The one bracket picked; `adult` is the default the form opens on. */
  selected: string;
  /** 0..1 - the custom-bracket input in place of the "+ Dodaj" button. */
  adding?: number;
  /** What has been typed into it; empty draws `guests.add.age_group_custom_placeholder`. */
  draft?: string;
  /** The input's caret, on while it is being typed into. */
  caret?: boolean;
  pointer?: DrawerPointer;
};

export const EditGuestDrawer: React.FC<Props> = ({
  drawer,
  scale,
  name,
  options,
  selected,
  adding = 0,
  draft = "",
  caret = false,
  pointer,
}) => {
  const pointerOn = (target: DrawerTarget) =>
    pointer?.target === target ? <PointerOverlay pointer={pointer} scale={scale} /> : null;

  return (
    <div
      style={{
        position: "relative",
        width: drawer ? "100%" : 448 * scale,
        display: "flex",
        flexDirection: "column",
        gap: drawer ? 0 : 16 * scale,
        padding: drawer ? 0 : 16 * scale,
        borderRadius: drawer ? `${12 * scale}px ${12 * scale}px 0 0` : 12 * scale,
        border: drawer ? undefined : `1px solid ${RING}`,
        borderTop: `1px solid ${drawer ? colors.border : RING}`,
        backgroundColor: colors.bg,
        boxShadow: shadow.card,
        fontFamily: fonts.sans,
        color: colors.ink,
      }}
    >
      {drawer ? (
        <div
          style={{
            alignSelf: "center",
            marginTop: 12 * scale,
            width: 48 * scale,
            height: 6 * scale,
            borderRadius: 999,
            backgroundColor: "rgba(123, 115, 107, 0.3)",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * scale,
          padding: drawer ? 16 * scale : `0 ${28 * scale}px 0 0`,
        }}
      >
        <div style={{ fontFamily: fonts.heading, fontSize: 16 * scale, fontWeight: 500, lineHeight: 1 }}>
          {tl.guests.edit}
        </div>
        {drawer ? <Icon name="x" color={colors.inkSoft} size={20 * scale} /> : null}
      </div>
      {drawer ? null : (
        <div
          style={{
            position: "absolute",
            top: 8 * scale,
            right: 8 * scale,
            width: 28 * scale,
            height: 28 * scale,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="x" color={colors.ink} size={16 * scale} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20 * scale,
          padding: drawer ? `0 ${16 * scale}px ${16 * scale}px` : 0,
        }}
      >
        <Field label={tl.guests.form.name} scale={scale}>
          <TextField value={name} placeholder={name} scale={scale} />
        </Field>

        {/* Nobody on this list has typed a diet, so every preset is unselected -
            the form shows them whichever field the couple came for. */}
        <Field label={tl.guests.form.dietary} scale={scale}>
          {DIETARY_PRESETS.map((preset) => (
            <Pill key={preset} label={preset} scale={scale} tone="outline" />
          ))}
          <Pill label={tl.guests.form.dietaryCustom} scale={scale} tone="outline">
            <div style={{ display: "flex", order: -1 }}>
              <Icon name="plus" color={colors.ink} size={16 * scale} />
            </div>
          </Pill>
        </Field>

        <Field label={tl.guests.form.ageGroup} scale={scale}>
          {options.map((option) => {
            const picked = option === selected;
            // Adults are the default and never earn a badge on the row, so that
            // pill stays the neutral black; a child bracket previews the violet
            // the guest is about to carry.
            const tone = !picked ? "outline" : option === "adult" ? "primary" : "age";
            const custom = !AGE_GROUP_PRESETS.includes(option);
            return (
              <Pill key={option} label={ageGroupLabel(option)} scale={scale} tone={tone}>
                {/* A typed bracket is a `DeletableTagPill` - it can be dropped again. */}
                {custom ? (
                  <div style={{ display: "flex", opacity: 0.7, paddingLeft: 2 * scale }}>
                    <Icon name="x" color={tone === "outline" ? colors.ink : colors.bg} size={14 * scale} />
                  </div>
                ) : null}
                {pointerOn(`age:${option}`)}
              </Pill>
            );
          })}

          {adding > 0 ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 * scale, opacity: adding }}>
              <div
                style={{
                  width: 128 * scale,
                  height: 32 * scale,
                  display: "flex",
                  alignItems: "center",
                  padding: `0 ${12 * scale}px`,
                  borderRadius: 999,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  fontSize: 14 * scale,
                  color: draft ? colors.ink : colors.inkSoft,
                }}
              >
                {draft || tl.guests.form.ageGroupPlaceholder}
                {caret ? (
                  <div
                    style={{
                      marginLeft: 1 * scale,
                      width: 1.5 * scale,
                      height: 16 * scale,
                      backgroundColor: colors.ink,
                    }}
                  />
                ) : null}
              </div>
              <div
                style={{
                  position: "relative",
                  width: 28 * scale,
                  height: 28 * scale,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: colors.primary,
                }}
              >
                <Icon name="check" color={colors.primaryInk} size={16 * scale} strokeWidth={2.4} />
                {pointerOn("confirm")}
              </div>
            </span>
          ) : (
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Pill label={tl.guests.form.ageGroupCustom} scale={scale} tone="outline">
                <div style={{ display: "flex", order: -1 }}>
                  <Icon name="plus" color={colors.ink} size={16 * scale} />
                </div>
                {pointerOn("custom")}
              </Pill>
            </div>
          )}
        </Field>

        <Field label={tl.guests.form.note} scale={scale}>
          <TextField placeholder={tl.guests.form.notePlaceholder} scale={scale} />
        </Field>

        <div
          style={{
            position: "relative",
            height: 32 * scale,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8 * scale,
            backgroundColor: colors.primary,
            color: colors.primaryInk,
            fontSize: 14 * scale,
            fontWeight: 500,
            transform: `translateY(${pointer?.target === "save" && pointer.pressed ? 1 : 0}px)`,
          }}
        >
          {tl.guests.form.save}
          {pointerOn("save")}
        </div>
      </div>
    </div>
  );
};

/** The sheet's own entrance: a slide up as a drawer, `zoom-in-95` as a dialog - `DialogMotion`'s shape. */
export const DrawerMotion: React.FC<{ open: number; drawer: boolean; children: React.ReactNode }> = ({
  open,
  drawer,
  children,
}) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      opacity: drawer ? 1 : open,
      transform: drawer ? `translateY(${(1 - open) * 100}%)` : `scale(${interpolate(open, [0, 1], [0.95, 1])})`,
    }}
  >
    {children}
  </div>
);
