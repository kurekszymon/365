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
//   - string literal union: no runtime definition from lib.ts (type-only).
//     The bundled output still includes consumer runtime code.
//   - as const object: plain object literal, no /* @__PURE__ */ marker on the
//     object definition, so esbuild preserves the whole literal in
//     out/tree-shake/as-const-bundled.js. Per-property DCE on plain objects
//     is off the table.
//   - regular enum: esbuild's TS frontend rewrites the enum to a
//     /* @__PURE__ */-annotated IIFE itself (tsc does NOT add that marker —
//     run `tsc` on lib.ts to see a bare IIFE). Because the IIFE is marked pure
//     and esbuild inlines string-enum member accesses to their literals,
//     `Direction.Up` becomes "UP" and the enum wrapper is DCE'd in
//     out/tree-shake/enum-bundled.js.

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

const patterns = ["enum", "num-enum", "as-const", "string-union"] as const;

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
  "note: the `/* @__PURE__ */` annotation on the `enum`/`num-enum` IIFE comes\n" +
    "from esbuild's own TypeScript frontend — tsc does not emit it. For string\n" +
    'enums, esbuild also inlines member accesses (`Direction.Up` → `"UP"`), so\n' +
    "the wrapper is DCE'd (see out/tree-shake/enum-bundled.js). For numeric\n" +
    "enums, esbuild inlines member accesses to their numeric literals\n" +
    "`Direction.Up` → `0`), so the wrapper is likewise DCE'd — but the IIFE\n" +
    "is larger because numeric enums also emit reverse mappings\n" +
    "(see out/tree-shake/num-enum-transformed.js). `as const` objects are plain\n" +
    "object literals, so bundlers preserve the literal when a property is used\n" +
    "(see out/tree-shake/as-const-bundled.js). string literal union has no\n" +
    "runtime lib emit, so only consumer runtime code remains\n" +
    "(see out/tree-shake/string-union-bundled.js).",
);
console.log("\nartifacts: out/tree-shake");
