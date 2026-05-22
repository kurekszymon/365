// Bundle-size measurement across patterns, comparing esbuild vs rolldown.
//
// Two scenarios per pattern:
//   - "definition only"  — what the pattern declaration itself emits.
//   - "100-use scenario" — definition + many call sites bundled as one file.
//
// For each, we report raw, minified, and gzipped bytes.
//
// Artifacts:
//   out/esbuild/sizes/<pattern>.{raw,min}.js
//   out/rolldown/sizes/<pattern>.{raw,min}.js

import { build, BuildOptions, transform } from "esbuild";
import { rolldown } from "rolldown";
import { gzipSync } from "node:zlib";
import { resolve } from "path";
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "fs";

const root = resolve(import.meta.dir, "..");
const esbuildOut = resolve(root, "out", "esbuild", "sizes");
const rolldownOut = resolve(root, "out", "rolldown", "sizes");
rmSync(resolve(root, "out", "esbuild", "sizes"), {
  recursive: true,
  force: true,
});
rmSync(resolve(root, "out", "rolldown", "sizes"), {
  recursive: true,
  force: true,
});
mkdirSync(esbuildOut, { recursive: true });
mkdirSync(rolldownOut, { recursive: true });

type Sizes = { raw: number; min: number; gz: number };
type Row = { pattern: string; esbuild: Sizes; rolldown: Sizes };

// ─── esbuild helpers ─────────────────────────────────────────────────────────

async function esbuildTransform(label: string, source: string): Promise<Sizes> {
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
  writeFileSync(resolve(esbuildOut, `${label}.raw.js`), raw.code);
  writeFileSync(resolve(esbuildOut, `${label}.min.js`), min.code);
  return {
    raw: Buffer.byteLength(raw.code, "utf8"),
    min: Buffer.byteLength(min.code, "utf8"),
    gz: gzipSync(Buffer.from(min.code, "utf8")).byteLength,
  };
}

const esbuildBuildCfg = {
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
} satisfies BuildOptions;

async function esbuildBundle(
  label: string,
  entryPoint: string,
): Promise<Sizes> {
  const built = await build({ ...esbuildBuildCfg, entryPoints: [entryPoint] });
  const minBuilt = await build({
    ...esbuildBuildCfg,
    entryPoints: [entryPoint],
    minify: true,
  });
  const rawCode = built.outputFiles[0].text;
  const minCode = minBuilt.outputFiles[0].text;
  writeFileSync(resolve(esbuildOut, `${label}.raw.js`), rawCode);
  writeFileSync(resolve(esbuildOut, `${label}.min.js`), minCode);
  return {
    raw: Buffer.byteLength(rawCode, "utf8"),
    min: Buffer.byteLength(minCode, "utf8"),
    gz: gzipSync(Buffer.from(minCode, "utf8")).byteLength,
  };
}

// ─── rolldown helpers ─────────────────────────────────────────────────────────

async function rolldownBundle(
  label: string,
  entryPoint: string,
  outDir: string,
  minify: boolean,
): Promise<string> {
  const bundle = await rolldown({ input: entryPoint });
  const { output } = await bundle.generate({ format: "esm", minify });
  const code = output[0].code;
  writeFileSync(resolve(outDir, `${label}.${minify ? "min" : "raw"}.js`), code);
  await bundle.close();
  return code;
}

async function measureRolldown(
  label: string,
  entryPoint: string,
): Promise<Sizes> {
  const rawCode = await rolldownBundle(label, entryPoint, rolldownOut, false);
  const minCode = await rolldownBundle(label, entryPoint, rolldownOut, true);
  return {
    raw: Buffer.byteLength(rawCode, "utf8"),
    min: Buffer.byteLength(minCode, "utf8"),
    gz: gzipSync(Buffer.from(minCode, "utf8")).byteLength,
  };
}

// ─── pattern 1: definition-only ──────────────────────────────────────────────

console.log("─".repeat(80));
console.log("definition-only emit (a file declaring the pattern, no usage)");
console.log("─".repeat(80));

const defRows: Row[] = [];
for (const pattern of [
  "enum",
  "num-enum",
  "as-const",
  "string-union",
  "const-enum",
]) {
  const libFile = resolve(root, "src/bundle-sizes", pattern, "lib.ts");
  const src = readFileSync(libFile, "utf8");
  const esbuildSizes = await esbuildTransform(pattern, src);
  const rdSizes = await measureRolldown(pattern, libFile);
  defRows.push({ pattern, esbuild: esbuildSizes, rolldown: rdSizes });
}

printTable(defRows);

// ─── pattern 2: 100-use scenario ─────────────────────────────────────────────

console.log("\n" + "─".repeat(80));
console.log(
  "100-use scenario (definition + 100 call sites bundled as one file)",
);
console.log("─".repeat(80));

const useRows: Row[] = [];
for (const pattern of [
  "enum",
  "num-enum",
  "as-const",
  "string-union",
  "const-enum",
]) {
  const entryPoint = resolve(root, "src/bundle-sizes", pattern, "consumer.ts");
  const label = `${pattern}-100uses`;
  const esbuildSizes = await esbuildBundle(label, entryPoint);
  const rdSizes = await measureRolldown(label, entryPoint);
  useRows.push({ pattern: label, esbuild: esbuildSizes, rolldown: rdSizes });
}

printTable(useRows);

console.log(
  "\nnote: gzip is the column that matters in production. 100-byte differences\n" +
    "minified collapse to single-digit deltas once gzip handles repeated literals.",
);
console.log("\nartifacts: out/esbuild/sizes  out/rolldown/sizes");

// ─── helpers ─────────────────────────────────────────────────────────────────

function printTable(rows: Row[]) {
  const col = 10;
  const patW = 24;
  console.log(
    "\n" +
      "pattern".padEnd(patW) +
      "esbuild".padStart((col * 3) / 2).padEnd(col * 3) +
      "rolldown".padStart((col * 3) / 2),
  );
  console.log(
    " ".repeat(patW) +
      "raw".padStart(col) +
      "min".padStart(col) +
      "gzip".padStart(col) +
      "raw".padStart(col) +
      "min".padStart(col) +
      "gzip".padStart(col),
  );
  console.log("─".repeat(patW + col * 6));
  for (const r of rows) {
    const e = r.esbuild;
    const rd = r.rolldown;
    console.log(
      r.pattern.padEnd(patW) +
        String(e.raw).padStart(col) +
        String(e.min).padStart(col) +
        String(e.gz).padStart(col) +
        String(rd.raw).padStart(col) +
        String(rd.min).padStart(col) +
        String(rd.gz).padStart(col),
    );
  }
}
