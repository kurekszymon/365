# probably should create a react app and build like this for real world usage. in current setup enum gets inlined which is not the case for default (i.e.) tanstack configuration

# enums-benchmark

Sandbox for the `fwd: enums` article. Compares TypeScript enum-like patterns
for bundle size, tree-shaking, and type safety (esbuild + rolldown).

## patterns

| location                                 | pattern                                                                          | used in size/tree-shake |
| ---------------------------------------- | -------------------------------------------------------------------------------- | ----------------------- |
| `src/patterns/enum.ts`                   | regular `enum`                                                                   | examples/type-safety    |
| `src/patterns/string-union.ts`           | string literal union                                                             | examples/type-safety    |
| `src/patterns/as-const.ts`               | `as const` object + derived type                                                 | examples/type-safety    |
| `src/patterns/const-enum.ts`             | `const enum`                                                                     | typecheck only          |
| `src/bundle-sizes/*`, `src/tree-shake/*` | benchmark fixtures: `enum`, `num-enum`, `as-const`, `string-union`, `const-enum` | yes                     |

## commands

```sh
pnpm install

# bundle sizes — definition-only and 100-use scenarios
pnpm sizes

# tree-shaking — what survives when a consumer imports one member.
# Writes artifacts to out/esbuild/tree-shake/ and out/rolldown/tree-shake/
# (git-ignored). For esbuild, check out/esbuild/tree-shake/enum-minified.js.
pnpm treeshake

# typecheck — isolatedModules: true (modern bundler mode)
pnpm typecheck

# typecheck — isolatedModules: false (whole-program tsc), includes const-enum
pnpm typecheck:tsc
```

## environment (numbers below were measured on this)

- CPU: Apple M3 (arm64)
- OS: macOS Darwin 25.4.0
- Package manager: pnpm

Re-run on different hardware and the absolute numbers shift, but the ratios
between patterns are robust.

## headline results

### bundle sizes — definition only (esbuild)

| pattern              | raw | min | gzip |
| -------------------- | --: | --: | ---: |
| `enum`               | 239 | 100 |  113 |
| `num-enum`           | 303 | 120 |  121 |
| `as const`           | 108 |  80 |  100 |
| string literal union |  87 |  62 |   82 |
| `const enum`         | 239 | 100 |  113 |

### bundle sizes — 100 call sites referencing the pattern

| pattern              |  raw |  min | gzip |
| -------------------- | ---: | ---: | ---: |
| `enum`               | 4230 | 2204 |  627 |
| `num-enum`           | 3750 | 1720 |  617 |
| `as const`           | 4071 | 2258 |  672 |
| string literal union | 3142 | 2192 |  625 |
| `const enum`         | 4184 | 2176 |  611 |

47 bytes between heaviest and lightest after gzip, over 100 usages. About
0.47 bytes per use. Pattern choice is usually not the dominant bundle-size lever.

### tree-shaking — consumer imports one member

| pattern              | bundled | min | gzip |
| -------------------- | ------: | --: | ---: |
| `enum`               |     161 |  80 |   60 |
| `num-enum`           |     146 |  61 |   47 |
| `as const`           |     271 | 134 |  106 |
| string literal union |     208 |  96 |   80 |
| `const enum`         |     167 |  80 |   60 |

esbuild's enum-aware DCE still wins here: for regular `enum`, member access is
inlined and the pure-marked wrapper can be dropped when only one member is used.
`as const` keeps a runtime object literal, so the bundle keeps more code.
`num-enum` can be even smaller in this setup.

## reference outputs

The raw clean output (ANSI stripped) of the last canonical run is committed in:

- `.sizes-results.txt`
- `.treeshake-results.txt`

Reproduce by running the scripts above on similar hardware.

Notes:

- The headline tables above are esbuild-only for readability.
- Full esbuild + rolldown tables are in `.sizes-results.txt` and `.treeshake-results.txt`.
