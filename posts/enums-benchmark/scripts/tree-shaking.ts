// Tree-shaking: if a file imports one member of a pattern, what's left after
// minification + DCE?
//
// Fixtures live in src/tree-shake/<pattern>/{lib,consumer}.ts. The consumer
// imports ONE value from the lib. We bundle the consumer with esbuild (bundle
// + minify) and measure the resulting size.
//
// Three files per pattern land in enums-benchmark/out/tree-shake/:
//   - <name>-transformed.js  esbuild's TS-frontend output for lib.ts BEFORE
//                            tree-shaking. This is where the /* @__PURE__ */
//                            marker on the enum IIFE is visible — the bundled
//                            file has it stripped because the wrapper itself
//                            was DCE'd. The transformed file is the proof.
//   - <name>-bundled.js      consumer bundled, tree-shaken, not minified.
//   - <name>-minified.js     same, plus minification.
//
// Expected behaviour:
//   - string literal union: zero cost. Type-only. Nothing to import. See
//     out/tree-shake/string-union-bundled.js — only the consumer's own
//     `const value = "UP"` survives; the import vanishes.
//   - as const object: plain object literal, no /* @__PURE__ */ anywhere
//     (compare out/tree-shake/as-const-transformed.js with the enum one
//     — the marker is absent), so esbuild preserves the whole literal in
//     out/tree-shake/as-const-bundled.js. Per-property DCE on plain objects
//     is off the table; the marker can only drop an entire expression when
//     its result is unused.
//   - regular enum: esbuild's TS frontend rewrites the enum to a
//     /* @__PURE__ */-annotated IIFE itself (tsc does NOT add that marker —
//     run `tsc` on lib.ts to see a bare IIFE). The annotation is visible in
//     out/tree-shake/enum-transformed.js — open it to see
//     `export var Direction = /* @__PURE__ */ ((Direction2) => { … })(…)`.
//     Because the IIFE is marked pure AND esbuild inlines string-enum member
//     accesses to their literals, `Direction.Up` becomes "UP" and the whole
//     wrapper is DCE'd in out/tree-shake/enum-bundled.js: a single
//     `console.log("UP" /* Up */)`.
//   - pure-marked as const: same shape as as-const, but the factory is wrapped
//     in a hand-written /* @__PURE__ */ IIFE. When Direction.Up is accessed
//     the object must still be constructed — size equals as-const. The
//     annotation only helps when the result is entirely dead, in which case
//     the whole IIFE is dropped rather than preserved for its potential
//     side effects.

import { build, transform, type BuildOptions } from "esbuild";
import { gzipSync } from "node:zlib";
import { resolve } from "path";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";

const root = resolve(import.meta.dir, "..");
const outDir = resolve(root, "out", "tree-shake");
const fixturesDir = resolve(root, "src", "tree-shake");
const tsconfig = resolve(root, "tsconfig.json");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const patterns = ["enum", "as-const", "string-union"] as const;

// Shared esbuild options. `target` is inherited from tsconfig; the rest are
// esbuild-specific bundler flags that don't exist in tsconfig.
const baseConfig = {
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  treeShaking: true,
  tsconfig,
} satisfies BuildOptions;

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

for (const name of patterns) {
  const entryPoints = [resolve(fixturesDir, name, "consumer.ts")];

  const built = await build({ ...baseConfig, entryPoints });
  const minBuilt = await build({ ...baseConfig, entryPoints, minify: true });

  // Transform-only emit of lib.ts: no bundling, no DCE, no minify. This is
  // what esbuild's TypeScript frontend produces BEFORE tree-shaking runs, so
  // the /* @__PURE__ */ marker on the enum IIFE is preserved verbatim and
  // can be eyeballed in out/tree-shake/<name>-transformed.js. The bundled
  // file shows the post-DCE result; the transformed file shows the input
  // that DCE was working from.
  const libSource = readFileSync(resolve(fixturesDir, name, "lib.ts"), "utf8");
  const transformed = await transform(libSource, {
    loader: "ts",
    format: "esm",
    target: "es2022",
  });

  const code = built.outputFiles[0].text;
  const min = minBuilt.outputFiles[0].text;
  writeFileSync(resolve(outDir, `${name}-bundled.js`), code);
  writeFileSync(resolve(outDir, `${name}-minified.js`), min);
  writeFileSync(resolve(outDir, `${name}-transformed.js`), transformed.code);

  console.log(
    name.padEnd(20) +
      String(Buffer.byteLength(code, "utf8")).padStart(10) +
      String(Buffer.byteLength(min, "utf8")).padStart(8) +
      String(gzipSync(Buffer.from(min, "utf8")).byteLength).padStart(8),
  );
}

console.log(
  "note: the `/* @__PURE__ */` annotation on the `enum` IIFE comes from\n" +
    "esbuild's own TypeScript frontend — tsc does not emit it. Combined with\n" +
    'esbuild\'s string-enum member inlining, `Direction.Up` becomes `"UP"` and\n' +
    "the wrapper is DCE'd (see out/tree-shake/enum-bundled.js). `as const`\n" +
    "objects are plain object literals with no pure marker, so bundlers can't\n" +
    "drop individual properties while preserving object identity — the whole\n" +
    "literal ships (see out/tree-shake/as-const-bundled.js). string literal\n" +
    "union is type-only, so the import vanishes\n" +
    "(see out/tree-shake/string-union-bundled.js).\n" +
    "pure-marked has the same size as as-const — /* @__PURE__ */ marks the\n" +
    "factory call as side-effect-free, but since Direction.Up is accessed the\n" +
    "object must still be constructed. The annotation only eliminates the call\n" +
    "when the result is entirely dead (no reference at all). Per-property DCE\n" +
    "is not on the table for plain objects regardless of the marker — that is\n" +
    "exactly what makes the enum path (esbuild rewriting + inlining before\n" +
    "bundling) the unique case here.",
);
console.log(`\nartifacts: ${outDir}`);
