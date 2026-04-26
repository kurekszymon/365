//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  ...tanstackConfig,
  reactHooks.configs.flat["recommended-latest"],
  { rules: { "no-unused-vars": "warn" } },
  {
    ignores: [
      "src/components/ui",
      "src/lib/supabase.types.ts",
      "supabase/functions/**",
      ".output",
      "dist",
    ],
  },
]
