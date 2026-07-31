import React from "react";

export type NavKind = "plan" | "guests" | "reminders" | "assistant" | "settings";

export const NAV_ITEMS: { kind: NavKind; label: string }[] = [
  { kind: "plan", label: "Plan" },
  { kind: "guests", label: "Guests" },
  { kind: "reminders", label: "Reminders" },
  { kind: "assistant", label: "Assistant" },
  { kind: "settings", label: "Settings" },
];

/** The planner's navigation glyphs, shared by the desktop rail and mobile tab bar. */
export const NavIcon: React.FC<{ kind: NavKind; color: string; size: number }> = ({
  kind,
  color,
  size,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {kind === "plan" ? (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <circle cx="17.5" cy="17.5" r="3.5" />
      </>
    ) : null}
    {kind === "guests" ? (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
        <path d="M16 5.5a3 3 0 0 1 0 5.6" />
      </>
    ) : null}
    {kind === "reminders" ? (
      <>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10.5 19a2 2 0 0 0 3 0" />
      </>
    ) : null}
    {kind === "assistant" ? <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /> : null}
    {kind === "settings" ? (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
      </>
    ) : null}
  </svg>
);
