// Tree-shaking: if a file imports one member of a pattern, what's left after
// minification + DCE? Compares esbuild vs rolldown.
//
// Fixtures live in src/tree-shake/<pattern>/{lib,consumer}.ts. The consumer
// imports ONE value from the lib.
//
// Artifacts per bundler:
//   out/<bundler>/tree-shake/<name>-bundled.js     bundled, not minified
//   out/<bundler>/tree-shake/<name>-minified.js    bundled + minified
//
// esbuild-only extra:
//   out/esbuild/tree-shake/<name>-transformed.js   TS frontend output of lib.ts
//                                                  before DCE (shows /* @__PURE__ */)

import { build, transform, type BuildOptions } from "esbuild";
import { rolldown } from "rolldown";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const fixturesDir = resolve(root, "src", "tree-shake");
const tsconfig = resolve(root, "tsconfig.json");

const esbuildOut = resolve(root, "out", "esbuild", "tree-shake");
const rolldownOut = resolve(root, "out", "rolldown", "tree-shake");
rmSync(esbuildOut, { recursive: true, force: true });
rmSync(rolldownOut, { recursive: true, force: true });
mkdirSync(esbuildOut, { recursive: true });
mkdirSync(rolldownOut, { recursive: true });

const patterns = [
  "enum",
  "num-enum",
  "as-const",
  "string-union",
  "const-enum",
] as const;

const esbuildBase = {
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  treeShaking: true,
  tsconfig,
} satisfies BuildOptions;

type Sizes = { bundled: number; min: number; gz: number };

// ─── esbuild ─────────────────────────────────────────────────────────────────

async function esbuildTreeShake(name: string): Promise<Sizes> {
  const entryPoints = [resolve(fixturesDir, name, "consumer.ts")];
  const built = await build({ ...esbuildBase, entryPoints });
  const minBuilt = await build({ ...esbuildBase, entryPoints, minify: true });

  const libSource = readFileSync(resolve(fixturesDir, name, "lib.ts"), "utf8");
  const transformed = await transform(libSource, {
    loader: "ts",
    format: "esm",
    target: "es2022",
  });

  const code = built.outputFiles[0].text;
  const min = minBuilt.outputFiles[0].text;
  writeFileSync(resolve(esbuildOut, `${name}-bundled.js`), code);
  writeFileSync(resolve(esbuildOut, `${name}-minified.js`), min);
  writeFileSync(
    resolve(esbuildOut, `${name}-transformed.js`),
    transformed.code,
  );

  return {
    bundled: Buffer.byteLength(code, "utf8"),
    min: Buffer.byteLength(min, "utf8"),
    gz: gzipSync(Buffer.from(min, "utf8")).byteLength,
  };
}

// ─── rolldown ────────────────────────────────────────────────────────────────

async function rolldownTreeShake(name: string): Promise<Sizes> {
  const entryPoint = resolve(fixturesDir, name, "consumer.ts");

  const bundle = await rolldown({ input: entryPoint });
  const { output } = await bundle.generate({ format: "esm" });
  const code = output[0].code;
  await bundle.close();

  const minBundle = await rolldown({ input: entryPoint });
  const { output: minOutput } = await minBundle.generate({
    format: "esm",
    minify: true,
  });
  const min = minOutput[0].code;
  await minBundle.close();

  writeFileSync(resolve(rolldownOut, `${name}-bundled.js`), code);
  writeFileSync(resolve(rolldownOut, `${name}-minified.js`), min);

  return {
    bundled: Buffer.byteLength(code, "utf8"),
    min: Buffer.byteLength(min, "utf8"),
    gz: gzipSync(Buffer.from(min, "utf8")).byteLength,
  };
}

// ─── run ─────────────────────────────────────────────────────────────────────

console.log("─".repeat(80));
console.log("tree-shaking — consumer imports one member, what survives?");
console.log("─".repeat(80));

const col = 10;
const patW = 16;
console.log(
  "\n" +
    "pattern".padEnd(patW) +
    "esbuild".padStart((col * 3) / 2).padEnd(col * 3) +
    "rolldown".padStart((col * 3) / 2),
);
console.log(
  " ".repeat(patW) +
    "bundled".padStart(col) +
    "min".padStart(col) +
    "gzip".padStart(col) +
    "bundled".padStart(col) +
    "min".padStart(col) +
    "gzip".padStart(col),
);
console.log("─".repeat(patW + col * 6));

for (const name of patterns) {
  const esbuildSizes = await esbuildTreeShake(name);
  const rolldownSizes = await rolldownTreeShake(name);
  console.log(
    name.padEnd(patW) +
      String(esbuildSizes.bundled).padStart(col) +
      String(esbuildSizes.min).padStart(col) +
      String(esbuildSizes.gz).padStart(col) +
      String(rolldownSizes.bundled).padStart(col) +
      String(rolldownSizes.min).padStart(col) +
      String(rolldownSizes.gz).padStart(col),
  );
}

console.log(
  "\nnote: esbuild annotates enum IIFEs with /* @__PURE__ */ and inlines member\n" +
    "accesses, enabling DCE of the wrapper. rolldown (via oxc) may differ —\n" +
    "inspect out/esbuild/tree-shake vs out/rolldown/tree-shake for the diff.\n" +
    "out/esbuild/tree-shake/<name>-transformed.js shows the pre-DCE IR.",
);
console.log("\nartifacts: out/esbuild/tree-shake  out/rolldown/tree-shake");
