// Regular enum — compiles to an IIFE, exists at runtime

export enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

export enum Priority {
  Low,
  Medium,
  High,
}

export function move(dir: Direction): string {
  return `moving ${dir}`;
}

export function describe(p: Priority): string {
  return `priority level ${p}`;
}

// runtime iteration works
export const allDirections = Object.values(Direction);

// numeric reverse mapping works
export const priorityName = Priority[1]; // -> "Medium"

// nominal: only Direction values accepted, raw strings rejected by TS
// move("UP"); // ✗ — Argument of type '"UP"' is not assignable to parameter of type 'Direction'
move(Direction.Up); // ✓
