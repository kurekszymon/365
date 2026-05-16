# enums-benchmark

Sandbox for the `fwd: enums` article. Compares TypeScript enum-like patterns
for bundle size, tree-shaking, and type safety.

## patterns

| file                           | pattern                          | used in size/tree-shake |
| ------------------------------ | -------------------------------- | ----------------------- |
| `src/patterns/enum.ts`         | regular `enum`                   | yes                     |
| `src/patterns/string-union.ts` | string literal union             | yes                     |
| `src/patterns/as-const.ts`     | `as const` object + derived type | yes                     |
| `src/patterns/const-enum.ts`   | `const enum`                     | no (typecheck only)     |

## commands

```sh
bun install

# bundle sizes — definition-only and 100-use scenarios (enum/as-const/string-union)
bun run sizes

# tree-shaking — what survives when a consumer imports one member.
# Writes intermediate JS to out/tree-shake/ (git-ignored) so the inlined "UP"
# literal can be verified by opening out/tree-shake/enum-minified.js.
bun run treeshake

# typecheck — isolatedModules: true (modern bundler mode)
bun typecheck

# typecheck — isolatedModules: false (whole-program tsc), includes const-enum
bun run typecheck:tsc
```

## hardware (numbers below were measured on this)

- CPU: Apple M3 (arm64)
- OS: macOS Darwin 25.4.0
- Bun: 1.3.11 (uses **JavaScriptCore**, not V8)

Re-run on different hardware and the absolute numbers shift, but the ratios
between patterns are robust.

## headline results

### bundle sizes — definition only (esbuild)

| pattern              | raw | min | gzip |
| -------------------- | --: | --: | ---: |
| `enum`               | 239 | 100 |  113 |
| `as const`           | 108 |  80 |  100 |
| string literal union |  87 |  62 |   82 |

### bundle sizes — 100 call sites referencing the pattern

| pattern              |  raw |  min | gzip |
| -------------------- | ---: | ---: | ---: |
| `enum`               | 4230 | 2204 |  627 |
| `as const`           | 4071 | 2258 |  672 |
| string literal union | 3142 | 2192 |  625 |

47 bytes between heaviest and lightest after gzip, over 100 usages. About
0.47 bytes per use. Pattern choice is usually not the dominant bundle-size lever.

### tree-shaking — consumer imports one member

| pattern              | bundled | min | gzip |
| -------------------- | ------: | --: | ---: |
| `enum`               |     161 |  80 |   60 |
| `as const`           |     271 | 134 |  106 |
| string literal union |     208 |  96 |   80 |

esbuild's enum-aware DCE still wins here: for regular `enum`, member access is
inlined and the pure-marked wrapper can be dropped when only one member is used.
`as const` keeps a runtime object literal, so the bundle keeps more code.

## reference outputs

The raw clean output (ANSI stripped) of the last canonical run is committed in:

- `.sizes-results.txt`
- `.treeshake-results.txt`

Reproduce by running the scripts above on similar hardware.
