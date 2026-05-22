// Bundle-size measurement across three patterns.
//
// Each pattern is measured with esbuild in two scenarios:
//   - "definition only"  — what the pattern declaration itself emits.
//   - "100-use scenario" — definition + many call sites bundled as one file.
//
// For each, we report raw, minified, and gzipped bytes. Gzipped is what ships;
// raw/minified are useful for understanding what esbuild emits.
//
// Tree-shaking is measured by a separate script (scripts/tree-shaking.ts).
//
// Emitted JS is written to out/sizes/<pattern>.{raw,min}.js so numbers can be
// cross-checked against generated artifacts.

import { build, BuildOptions, transform } from "esbuild";
import { gzipSync } from "node:zlib";
import { resolve } from "path";
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "fs";

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
for (const pattern of [
  "enum",
  "num-enum",
  "as-const",
  "string-union",
  "const-enum",
]) {
  const src = readFileSync(
    resolve(root, "src/bundle-sizes", pattern, "lib.ts"),
    "utf8",
  );
  defRows.push(await transformAndWrite(pattern, src));
}

printTable(defRows);

// ─── pattern 2: 100-use scenario ──────────────────────────────────────────────
// What's the marginal cost when a pattern is referenced from 100 call sites?
// IIFEs and runtime objects pay once. Inlined strings pay per reference (until
// minifier deduplicates). The gzip column is the realistic answer.
console.log("\n" + "─".repeat(72));
console.log(
  "100-use scenario (definition + 100 call sites bundled as one file)",
);
console.log("─".repeat(72));

const buildCfg = {
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
} satisfies BuildOptions;

const useRows: Row[] = [];
for (const pattern of [
  "enum",
  "num-enum",
  "as-const",
  "string-union",
  "const-enum",
]) {
  const entryPoint = resolve(root, "src/bundle-sizes", pattern, "consumer.ts");
  const built = await build({
    ...buildCfg,
    entryPoints: [entryPoint],
  });
  const minBuilt = await build({
    ...buildCfg,
    entryPoints: [entryPoint],
    minify: true,
  });
  const rawCode = built.outputFiles[0].text;
  const minCode = minBuilt.outputFiles[0].text;
  writeFileSync(resolve(outDir, `${pattern}-100uses.raw.js`), rawCode);
  writeFileSync(resolve(outDir, `${pattern}-100uses.min.js`), minCode);
  useRows.push({
    pattern: `${pattern}-100uses`,
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
console.log("\nartifacts: out/sizes");

// ─── helpers ─────────────────────────────────────────────────────────────────
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
