import { Direction as EnumDirection } from "./patterns/enum";
import { Direction as AsConstDirection } from "./patterns/as-const";

const RUNS = 5_000_000;

function bench(label: string, fn: () => void): void {
  // warmup
  for (let i = 0; i < 10_000; i++) fn();
  const start = performance.now();
  for (let i = 0; i < RUNS; i++) fn();
  const ms = performance.now() - start;
  const nsPerOp = ((ms / RUNS) * 1e6).toFixed(2);
  console.log(`${label.padEnd(52)} ${nsPerOp.padStart(8)} ns/op`);
}

// prevent dead-code elimination
let sink = 0;
const consume = (v: string) => { sink += v.length; };
const consumeBool = (v: boolean) => { sink += v ? 1 : 0; };
const consumeNum = (v: number) => { sink += v; };

const enumVal = EnumDirection.Up;
const asConstVal = AsConstDirection.Up;
const rawString: string = "UP";
const STRING_DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;

console.log(`\n${"─".repeat(64)}`);
console.log(`TypeScript enum patterns — runtime benchmark (${RUNS.toLocaleString()} iterations)`);
console.log("─".repeat(64));

console.log("\n[property access]");
bench("enum: Direction.Up", () => consume(EnumDirection.Up));
bench("as const: Direction.Up", () => consume(AsConstDirection.Up));
bench("string literal: 'UP' (raw)", () => consume(rawString));

console.log("\n[equality check]");
bench("enum: val === Direction.Up", () => consumeBool(enumVal === EnumDirection.Up));
bench("as const: val === Direction.Up", () => consumeBool(asConstVal === AsConstDirection.Up));
bench("string literal: val === 'UP'", () => consumeBool(rawString === "UP"));

console.log("\n[Object.values / array iteration]");
bench("enum: Object.values(Direction)", () => consumeNum(Object.values(EnumDirection).length));
bench("as const: Object.values(Direction)", () => consumeNum(Object.values(AsConstDirection).length));
bench("string union: array.length (parallel array)", () => consumeNum(STRING_DIRECTIONS.length));

console.log("\n[membership check / narrowing]");
bench("enum: Object.values includes", () =>
  consumeBool((Object.values(EnumDirection) as string[]).includes("UP"))
);
bench("as const: Object.values includes", () =>
  consumeBool((Object.values(AsConstDirection) as string[]).includes("UP"))
);
bench("string union: array includes", () =>
  consumeBool((STRING_DIRECTIONS as readonly string[]).includes("UP"))
);

console.log("\n" + "─".repeat(64) + "\n");

// prevent elimination
process.on("exit", () => { if (sink < 0) console.log(sink); });
