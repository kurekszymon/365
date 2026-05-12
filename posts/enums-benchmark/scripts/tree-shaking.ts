// Tree-shaking: if a file imports one member of a pattern, what's left after
// minification + DCE?
//
// For each pattern, we generate:
//   1. A "library" file that declares the pattern (4 variants).
//   2. A "consumer" file that imports the file and uses ONE value.
// Then we bundle the consumer with esbuild (bundle + minify) and measure the
// resulting size.
//
// All emitted JS is written to enums-benchmark/out/tree-shake/ so the claim
// "esbuild DCE'd the IIFE down to a single inlined string" can be verified by
// reading the minified output directly.
//
// Expected behaviour:
//   - string literal union: zero cost. Type-only. Nothing to import.
//   - as const object: depends on whether esbuild can DCE the unused properties.
//     Plain object literals are usually preserved whole (side-effect free, but
//     not eliminable on a per-property basis without /* @__PURE__ */ marker).
//   - regular enum: surprise — esbuild understands enum semantics and DCEs the
//     IIFE down to a single inlined string.

import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { resolve } from "path";
import { writeFileSync, mkdirSync, rmSync } from "fs";

const root = resolve(import.meta.dir, "..");
const outDir = resolve(root, "out", "tree-shake");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const libs = {
  enum: `
export enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}
`,
  "as-const": `
export const Direction = {
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];
`,
  "string-union": `
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export const DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const satisfies Direction[];
`,
};

const consumers = {
  enum: `
import { Direction } from "./lib";
console.log(Direction.Up);
`,
  "as-const": `
import { Direction } from "./lib";
console.log(Direction.Up);
`,
  "string-union": `
import type { Direction } from "./lib";
const value: Direction = "UP";
console.log(value);
`,
};

console.log("─".repeat(72));
console.log("tree-shaking — consumer imports one member, what survives?");
console.log("─".repeat(72));
console.log(
  "\n" +
    "pattern".padEnd(20) +
    "bundled".padStart(10) +
    "min".padStart(8) +
    "gzip".padStart(8),
);
console.log("─".repeat(46));

for (const [name, lib] of Object.entries(libs)) {
  const libPath = resolve(outDir, `${name}-lib.ts`);
  const consumerPath = resolve(outDir, `${name}-consumer.ts`);
  writeFileSync(libPath, lib);
  writeFileSync(
    consumerPath,
    consumers[name as keyof typeof consumers].replace("./lib", `./${name}-lib`),
  );

  const built = await build({
    entryPoints: [consumerPath],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    treeShaking: true,
  });
  const minBuilt = await build({
    entryPoints: [consumerPath],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    treeShaking: true,
    minify: true,
  });
  const code = built.outputFiles[0].text;
  const min = minBuilt.outputFiles[0].text;
  writeFileSync(resolve(outDir, `${name}-bundled.js`), code);
  writeFileSync(resolve(outDir, `${name}-minified.js`), min);

  console.log(
    name.padEnd(20) +
      String(Buffer.byteLength(code, "utf8")).padStart(10) +
      String(Buffer.byteLength(min, "utf8")).padStart(8) +
      String(gzipSync(Buffer.from(min, "utf8")).byteLength).padStart(8),
  );
}

console.log(
  "\nnote: surprise outcome. esbuild understands `enum` semantics well enough to\n" +
    "DCE the entire IIFE when only one member is referenced — `Direction.Up` is\n" +
    'inlined as `"UP"`, the rest vanishes. `as const` objects, by contrast, are\n' +
    "plain expressions the bundler can't prove side-effect-free, so the whole\n" +
    "literal ships. string literal union is type-only, so the import vanishes.",
);
console.log(`\nartifacts: ${outDir}`);
