import React from "react";
import { DRAWER_HANDLE, DrawerHandle } from "../../components/HallPanel";
import { Icon } from "../../components/Icon";
import { PAGE_TOP, PHONE } from "../../components/PhoneFrame";
import { tl, type DietKey } from "../../i18n";
import { colors, fonts } from "../../theme";

/**
 * `dialogs/guests/AddGuestDialog.tsx` at easywed/v1.1.2 on a phone, where its
 * `ResponsiveDialog` is a bottom drawer: the title *Dodaj gościa* with the X,
 * then `ResponsiveDialogBody` (`px-4 gap-4`) holding `GuestFormFields` - *Imię i
 * nazwisko* with its *Jan Kowalski* placeholder, the diet pills, the age-group
 * pills on *Dorosły*, *Notatka* - and *Zapisz*, disabled until a name is typed.
 * Sizes are the app's CSS pixels.
 */

const VIEWPORT = PHONE.height - PAGE_TOP;
/** `DrawerHeader`'s `p-4` round the `text-lg` title's 28 px line. */
const HEADER = 16 + 28 + 16;
const PAD_X = 16;
const GAP = 16;
/** `FieldLabel` at `text-sm leading-snug`, `Field`'s `gap-2`, an `h-8` input, the pills' `h-8` rows with `gap-1.5`. */
const LABEL = 14 * 1.375;
const LABEL_GAP = 8;
const INPUT = 32;
const PILL = 32;
const PILL_GAP = 6;
const BUTTON = 32;
const PAD_BOTTOM = Math.max(16, PHONE.safeBottom);

const inputField = LABEL + LABEL_GAP + INPUT;
const pillField = LABEL + LABEL_GAP + PILL;

/** Each field's top from the body's, and the button's. */
const TOPS = (() => {
  const name = 0;
  const dietary = name + inputField + GAP;
  const age = dietary + pillField + GAP;
  const note = age + pillField + GAP;
  const save = note + inputField + GAP;
  return { name, dietary, age, note, save, end: save + BUTTON };
})();

export const ADD_GUEST_HEIGHT = DRAWER_HANDLE + HEADER + TOPS.end + PAD_BOTTOM;
const SHEET_TOP = PHONE.height - ADD_GUEST_HEIGHT;
const BODY_TOP = SHEET_TOP + DRAWER_HANDLE + HEADER;

/** What the thumb and the camera aim at, in the phone screen's CSS px. */
export const ADD_GUEST_AT = {
  top: SHEET_TOP,
  name: { x: PHONE.width / 2, y: BODY_TOP + TOPS.name + LABEL + LABEL_GAP + INPUT / 2 },
  save: { x: PHONE.width / 2, y: BODY_TOP + TOPS.save + BUTTON / 2 },
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ height: LABEL, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: colors.ink }}>
    {children}
  </div>
);

const Pill: React.FC<{ on?: boolean; children: React.ReactNode }> = ({ on = false, children }) => (
  <div
    style={{
      height: PILL,
      padding: "0 12px",
      boxSizing: "border-box",
      borderRadius: 999,
      border: `1px solid ${on ? colors.primary : colors.border}`,
      backgroundColor: on ? colors.primary : colors.bg,
      color: on ? colors.primaryInk : colors.ink,
      fontSize: 14,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 4,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const DIETS: DietKey[] = ["vegetarian", "vegan", "glutenFree"];

export const AddGuestSheet: React.FC<{
  /** The drawer rising, 0..1, and falling again once it is saved. */
  enter: number;
  /** What is typed into the name so far. */
  name: string;
  /** Whether the name field has the caret. */
  focused: boolean;
  savePressed: boolean;
}> = ({ enter, name, focused, savePressed }) => {
  if (enter <= 0) return null;
  const f = tl.guests.form;
  const at = (top: number): React.CSSProperties => ({ position: "absolute", left: PAD_X, right: PAD_X, top: DRAWER_HANDLE + HEADER + top });

  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundColor: colors.drawerScrim, opacity: Math.min(1, enter) }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: VIEWPORT - ADD_GUEST_HEIGHT,
          height: ADD_GUEST_HEIGHT,
          transform: `translateY(${(1 - enter) * (ADD_GUEST_HEIGHT + 20)}px)`,
          boxSizing: "border-box",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          backgroundColor: colors.bg,
          boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
          fontFamily: fonts.sans,
          overflow: "hidden",
        }}
      >
        <DrawerHandle />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: DRAWER_HANDLE,
            height: HEADER,
            padding: `0 ${PAD_X}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontFamily: fonts.heading, fontSize: 18, lineHeight: "28px", fontWeight: 500, color: colors.ink }}>
            {tl.guests.add}
          </div>
          <Icon name="x" color={colors.inkSoft} size={20} />
        </div>

        <div style={at(TOPS.name)}>
          <Label>{f.name}</Label>
          <div
            style={{
              marginTop: LABEL_GAP,
              height: INPUT,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              borderRadius: 10,
              border: `1px solid ${focused ? colors.inkSoft : colors.border}`,
              boxShadow: focused ? "0 0 0 3px rgba(123, 115, 107, 0.35)" : undefined,
              fontSize: 16,
              color: colors.ink,
              whiteSpace: "pre",
              overflow: "hidden",
            }}
          >
            {name === "" ? null : name}
            {focused ? <div style={{ width: 1.5, height: 18, marginLeft: 1, backgroundColor: colors.ink }} /> : null}
            {name === "" ? <span style={{ color: colors.inkSoft }}>{f.namePlaceholder}</span> : null}
          </div>
        </div>

        <div style={at(TOPS.dietary)}>
          <Label>
            {f.dietary}
            <Icon name="info" color={colors.inkSoft} size={14} />
          </Label>
          <div style={{ marginTop: LABEL_GAP, display: "flex", gap: PILL_GAP }}>
            {DIETS.map((diet) => (
              <Pill key={diet}>{tl.diet[diet]}</Pill>
            ))}
            <Pill>
              <Icon name="plus" color={colors.ink} size={16} />
              {f.dietaryCustom}
            </Pill>
          </div>
        </div>

        <div style={at(TOPS.age)}>
          <Label>{f.ageGroup}</Label>
          <div style={{ marginTop: LABEL_GAP, display: "flex", gap: PILL_GAP }}>
            {/* `ADULT_AGE_GROUP` is the form's default, so it starts pressed. */}
            {(["adult", "0-3", "3-6"] as const).map((group, i) => (
              <Pill key={group} on={i === 0}>
                {tl.guests.ageGroup[group]}
              </Pill>
            ))}
            <Pill>
              <Icon name="plus" color={colors.ink} size={16} />
              {f.ageGroupCustom}
            </Pill>
          </div>
        </div>

        <div style={at(TOPS.note)}>
          <Label>{f.note}</Label>
          <div
            style={{
              marginTop: LABEL_GAP,
              height: INPUT,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              fontSize: 16,
              color: colors.inkSoft,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {f.notePlaceholder}
          </div>
        </div>

        {/* *Zapisz*, `disabled={!form.name.trim()}` - `disabled:opacity-50` until the first letter. */}
        <div
          style={{
            ...at(TOPS.save),
            height: BUTTON,
            borderRadius: 8,
            backgroundColor: colors.primary,
            color: colors.primaryInk,
            opacity: name.trim() ? 1 : 0.5,
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: savePressed ? "translateY(1px)" : undefined,
          }}
        >
          {f.save}
        </div>
      </div>
    </>
  );
};
