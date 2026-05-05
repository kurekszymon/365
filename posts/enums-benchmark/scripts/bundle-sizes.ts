import { build } from "esbuild";
import { resolve, basename } from "path";

const patterns = [
  "src/patterns/enum.ts",
  "src/patterns/string-union.ts",
  "src/patterns/as-const.ts",
];

// const-enum.ts is excluded — esbuild cannot handle cross-file const enum resolution
// it would need tsc to compile first, then esbuild bundles the JS output

const results: { name: string; raw: number; minified: number }[] = [];

for (const entry of patterns) {
  const rawResult = await build({
    entryPoints: [resolve(import.meta.dir, "..", entry)],
    bundle: false,
    write: false,
    format: "esm",
    platform: "neutral",
  });

  const minResult = await build({
    entryPoints: [resolve(import.meta.dir, "..", entry)],
    bundle: false,
    write: false,
    format: "esm",
    platform: "neutral",
    minify: true,
  });

  const rawBytes = rawResult.outputFiles[0].contents.byteLength;
  const minBytes = minResult.outputFiles[0].contents.byteLength;

  results.push({ name: basename(entry, ".ts"), raw: rawBytes, minified: minBytes });

  // print the actual JS output so we can see what was emitted
  console.log(`\n── ${basename(entry)} output (minified) ──`);
  console.log(new TextDecoder().decode(minResult.outputFiles[0].contents));
}

console.log("\n── bundle sizes ──");
console.log(
  "pattern".padEnd(20),
  "raw (bytes)".padStart(12),
  "minified (bytes)".padStart(18)
);
console.log("─".repeat(52));
for (const r of results) {
  console.log(r.name.padEnd(20), String(r.raw).padStart(12), String(r.minified).padStart(18));
}

console.log("\nnote: const-enum.ts excluded — single-file transpilers cannot inline const enum values");
console.log("      string literal union emits nothing (type-only), shown here as the type-alias file");
