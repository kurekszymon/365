// as const object — runtime object + derived union type

export const Direction = {
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
} as const;

// derive the union type from the object values
export type Direction = (typeof Direction)[keyof typeof Direction];

export function move(dir: Direction): string {
  return `moving ${dir}`;
}

move(Direction.Up); // ✓ — via named key
move("UP");         // ✓ — raw string also accepted (structural, not nominal)
// move("DIAGONAL"); // ✗ — type error

// runtime iteration works — it's just a plain object
export const allDirections = Object.values(Direction);

// array variant: derive union from tuple
export const Roles = ["admin", "user", "guest"] as const;
export type Role = (typeof Roles)[number];
// -> "admin" | "user" | "guest"

export function isRole(s: string): s is Role {
  return (Roles as readonly string[]).includes(s);
}
