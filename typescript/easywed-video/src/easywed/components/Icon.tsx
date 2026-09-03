import React from "react";

/**
 * The app's glyphs. Same lucide icons the planner uses (`Sidebar/tabs.ts`,
 * `CanvasToolbar`, the header buttons), traced as inline paths so the video has
 * no icon dependency but reads as the same product.
 */
export type IconName =
  | "guests"
  | "tables"
  | "fixtures"
  | "reminders"
  | "assistant"
  | "arrowLeft"
  | "chevronLeft"
  | "chevronRight"
  | "landmark"
  | "upload"
  | "download"
  | "user"
  | "userPlus"
  | "ruler"
  | "grid"
  | "armchair"
  | "search"
  | "plus"
  | "pencil"
  | "trash"
  | "check"
  | "fileUp"
  | "printer";

const PATHS: Record<IconName, React.ReactNode> = {
  guests: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  tables: (
    <>
      <path d="M3 2v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2" />
      <path d="M6 11v11" />
      <path d="M18 22v-7h3V7a5 5 0 0 0-3 4.6V15h3" />
    </>
  ),
  fixtures: (
    <>
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  reminders: (
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 19a2 2 0 0 0 3 0" />
    </>
  ),
  assistant: (
    <>
      <path d="M11 3.4a.5.5 0 0 1 1 0l1.2 4.6a2 2 0 0 0 1.4 1.4l4.6 1.2a.5.5 0 0 1 0 1l-4.6 1.2a2 2 0 0 0-1.4 1.4L12 18.6a.5.5 0 0 1-1 0l-1.2-4.4a2 2 0 0 0-1.4-1.4L3.8 11.6a.5.5 0 0 1 0-1L8.4 9.4a2 2 0 0 0 1.4-1.4z" />
      <path d="M19 3v3M20.5 4.5h-3M18.5 18v2M19.5 19h-2" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </>
  ),
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  landmark: (
    <>
      <path d="M12 2.5 21 8H3z" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
      <path d="M3 21h18" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  userPlus: (
    <>
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  ruler: (
    <>
      <path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z" />
      <path d="M7.5 10.5l2 2M11 7l2 2M14.5 3.5l2 2M4 14l2 2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  armchair: (
    <>
      <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
      <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z" />
      <path d="M5 18v2M19 18v2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 15H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  fileUp: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </>
  ),
};

export const Icon: React.FC<{
  name: IconName;
  color: string;
  size: number;
  strokeWidth?: number;
}> = ({ name, color, size, strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {PATHS[name]}
  </svg>
);

export type NavKind = "guests" | "tables" | "fixtures" | "reminders" | "assistant";

/** The planner's tab strip, in the app's order, with its badge counts. */
export const NAV_ITEMS: { kind: NavKind; label: string; badge?: number }[] = [
  { kind: "guests", label: "Goście" },
  { kind: "tables", label: "Stoły", badge: 7 },
  { kind: "fixtures", label: "Elementy", badge: 2 },
  { kind: "reminders", label: "Przypomnienia", badge: 1 },
  { kind: "assistant", label: "Asystent" },
];
