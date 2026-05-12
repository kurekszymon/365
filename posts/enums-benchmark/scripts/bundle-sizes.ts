// Bundle-size measurement across all four patterns.
//
// Each pattern is transpiled with esbuild in two modes:
//   - "definition only"   — what the pattern itself emits (the historical metric)
//   - "20-use scenario"   — definition + 20 call sites that reference a member,
//                           bundled as a single file. This shows the marginal
//                           cost when the pattern is actually used.
//
// For each, we report raw, minified, and gzipped bytes. Gzipped is what ships;
// raw/minified are useful for understanding what esbuild emits.
//
// `const enum` is special: esbuild can't inline it (no whole-program view), so
// instead we compile through tsc first (which DOES inline), then run the JS
// through esbuild minification + gzip. That's the only fair measurement of the
// "fully inlined" promise.
//
// All emitted JS is written to enums-benchmark/out/sizes/<pattern>.{raw,min}.js
// so the numbers below can be cross-checked by opening the files.

import { build, transform } from "esbuild";
import { gzipSync } from "node:zlib";
import { resolve, basename } from "path";
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "fs";
import { execSync } from "child_process";

const root = resolve(import.meta.dir, "..");
const outDir = resolve(root, "out", "sizes");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

type Row = {
  pattern: string;
  raw: number;
  minified: number;
  gzipped: number;
};

async function transformAndWrite(label: string, source: string): Promise<Row> {
  const raw = await transform(source, {
    loader: "ts",
    format: "esm",
    target: "es2022",
  });
  const min = await transform(source, {
    loader: "ts",
    format: "esm",
    target: "es2022",
    minify: true,
  });
  writeFileSync(resolve(outDir, `${label}.raw.js`), raw.code);
  writeFileSync(resolve(outDir, `${label}.min.js`), min.code);
  return {
    pattern: label,
    raw: Buffer.byteLength(raw.code, "utf8"),
    minified: Buffer.byteLength(min.code, "utf8"),
    gzipped: gzipSync(Buffer.from(min.code, "utf8")).byteLength,
  };
}

// ─── pattern 1: definition-only ──────────────────────────────────────────────
console.log("─".repeat(72));
console.log("definition-only emit (a file declaring the pattern, no usage)");
console.log("─".repeat(72));

const defRows: Row[] = [];
for (const entry of [
  "src/patterns/enum.ts",
  "src/patterns/as-const.ts",
  "src/patterns/string-union.ts",
]) {
  const src = readFileSync(resolve(root, entry), "utf8");
  defRows.push(await transformAndWrite(basename(entry, ".ts"), src));
}

// const-enum: pass through tsc first (whole-program inlines), then minify + gzip
// the resulting .js. Without this, esbuild silently downgrades const enum to a
// regular enum IIFE — which is the "footgun 1" path, not the inlined path.
{
  const tscOut = resolve(outDir, "_tsc-tmp");
  rmSync(tscOut, { recursive: true, force: true });
  execSync(
    `bun tsc --project ${resolve(root, "tsconfig.tsc.json")} --outDir ${tscOut} --noEmit false`,
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  const tscEmitted = readFileSync(
    resolve(tscOut, "src/patterns/const-enum.js"),
    "utf8",
  );
  const min = await transform(tscEmitted, {
    loader: "js",
    target: "es2022",
    minify: true,
  });
  writeFileSync(resolve(outDir, "const-enum.raw.js"), tscEmitted);
  writeFileSync(resolve(outDir, "const-enum.min.js"), min.code);
  rmSync(tscOut, { recursive: true, force: true });
  defRows.push({
    pattern: "const-enum (via tsc inline)",
    raw: Buffer.byteLength(tscEmitted, "utf8"),
    minified: Buffer.byteLength(min.code, "utf8"),
    gzipped: gzipSync(Buffer.from(min.code, "utf8")).byteLength,
  });
}

printTable(defRows);

// ─── pattern 2: 20-use scenario ──────────────────────────────────────────────
// What's the marginal cost when a pattern is referenced from 20 call sites?
// IIFEs and runtime objects pay once. Inlined strings pay per reference (until
// minifier deduplicates). The gzip column is the realistic answer.
console.log("\n" + "─".repeat(72));
console.log("20-use scenario (definition + 20 call sites bundled as one file)");
console.log("─".repeat(72));

const usePatterns: { name: string; src: string }[] = [
  {
    name: "enum-20uses",
    src:
      readFileSync(resolve(root, "src/patterns/enum.ts"), "utf8") +
      "\n" +
      generateUses("EnumDirection", (k) => `Direction.${k}`),
  },
  {
    name: "as-const-20uses",
    src:
      readFileSync(resolve(root, "src/patterns/as-const.ts"), "utf8") +
      "\n" +
      generateUses("AsConstDirection", (k) => `Direction.${k}`),
  },
  {
    name: "string-union-20uses",
    src:
      readFileSync(resolve(root, "src/patterns/string-union.ts"), "utf8") +
      "\n" +
      generateUses("StringUnion", (k) => `"${k.toUpperCase()}" as const`),
  },
];

const useRows: Row[] = [];
for (const p of usePatterns) {
  const srcFile = resolve(outDir, `${p.name}.src.ts`);
  writeFileSync(srcFile, p.src);
  const built = await build({
    entryPoints: [srcFile],
    bundle: false,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
  });
  const minBuilt = await build({
    entryPoints: [srcFile],
    bundle: false,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    minify: true,
  });
  const rawCode = built.outputFiles[0].text;
  const minCode = minBuilt.outputFiles[0].text;
  writeFileSync(resolve(outDir, `${p.name}.raw.js`), rawCode);
  writeFileSync(resolve(outDir, `${p.name}.min.js`), minCode);
  useRows.push({
    pattern: p.name,
    raw: Buffer.byteLength(rawCode, "utf8"),
    minified: Buffer.byteLength(minCode, "utf8"),
    gzipped: gzipSync(Buffer.from(minCode, "utf8")).byteLength,
  });
}

printTable(useRows);

console.log(
  "\nnote: gzip is the column that matters in production. 100-byte differences\n" +
    "minified collapse to single-digit deltas once gzip handles repeated literals.",
);
console.log(`\nartifacts: ${outDir}`);

// ─── helpers ─────────────────────────────────────────────────────────────────
function generateUses(suffix: string, ref: (k: string) => string): string {
  const keys = ["Up", "Down", "Left", "Right"];
  const lines: string[] = [];
  for (let i = 0; i < 20; i++) {
    const k = keys[i % 4]!;
    lines.push(`export const use_${suffix}_${i} = ${ref(k)};`);
  }
  return lines.join("\n");
}

function printTable(rows: Row[]) {
  console.log(
    "\n" +
      "pattern".padEnd(34) +
      "raw".padStart(8) +
      "min".padStart(8) +
      "gzip".padStart(8),
  );
  console.log("─".repeat(58));
  for (const r of rows) {
    console.log(
      r.pattern.padEnd(34) +
        String(r.raw).padStart(8) +
        String(r.minified).padStart(8) +
        String(r.gzipped).padStart(8),
    );
  }
}
