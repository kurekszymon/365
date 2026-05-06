// String literal union — pure type-level, zero emit

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export function move(dir: Direction): string {
  return `moving ${dir}`;
}

move("UP");    // ✓
move("LEFT");  // ✓
// move("DIAGONAL"); // ✗ — type error

// no runtime object — cannot iterate over possible values at runtime
// but you can check membership if you maintain a parallel array:
export const DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const satisfies Direction[];

export function isDirection(s: string): s is Direction {
  return (DIRECTIONS as readonly string[]).includes(s);
}
