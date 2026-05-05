// Type safety comparison — what each pattern catches at compile time

import { Direction as EnumDirection } from "./patterns/enum";
import { Direction as AsConstDirection, Role } from "./patterns/as-const";
import { Direction as UnionDirection, isDirection } from "./patterns/string-union";

// --- enum: nominal typing ---
// Only accepts Direction enum members, not raw strings with matching values
function moveEnum(dir: EnumDirection) {
  return dir;
}
moveEnum(EnumDirection.Up);      // ✓
// @ts-expect-error — nominal: raw string rejected even if value matches
moveEnum("UP");

// --- as const: structural typing ---
// Accepts both named keys and raw strings with matching values
function moveAsConst(dir: AsConstDirection) {
  return dir;
}
moveAsConst(AsConstDirection.Up); // ✓
moveAsConst("UP");                 // ✓ — structural, raw string accepted
// @ts-expect-error — still catches invalid values
moveAsConst("DIAGONAL");

// --- string union: structural typing ---
function moveUnion(dir: UnionDirection) {
  return dir;
}
moveUnion("UP");    // ✓ — raw string accepted directly
moveUnion("DOWN");  // ✓
// @ts-expect-error — invalid value still rejected
moveUnion("DIAGONAL");

// --- exhaustiveness check works with all patterns ---
function assertNever(x: never): never {
  throw new Error(`unhandled case: ${x}`);
}

function handleEnum(dir: EnumDirection): string {
  switch (dir) {
    case EnumDirection.Up:    return "up";
    case EnumDirection.Down:  return "down";
    case EnumDirection.Left:  return "left";
    case EnumDirection.Right: return "right";
    default: return assertNever(dir); // ✓ exhaustive
  }
}

function handleUnion(dir: UnionDirection): string {
  switch (dir) {
    case "UP":    return "up";
    case "DOWN":  return "down";
    case "LEFT":  return "left";
    case "RIGHT": return "right";
    default: return assertNever(dir); // ✓ exhaustive
  }
}

// --- runtime narrowing: only as const and string union can validate unknown input ---
function processInput(raw: string) {
  if (isDirection(raw)) {
    // raw is narrowed to UnionDirection here
    moveUnion(raw); // ✓
  }
}

// enum cannot narrow from string without a cast
function processInputEnum(raw: string) {
  // no built-in isEnum guard — must write your own or cast
  const dir = raw as EnumDirection;
  moveEnum(dir); // compiles but unsafe at runtime
}

// Role narrowing via as const array
const ROLES = ["admin", "user", "guest"] as const;
function isRole(s: string): s is Role {
  return (ROLES as readonly string[]).includes(s);
}
