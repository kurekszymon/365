//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    ignores: ["src/components/ui", "src/components/planner", "src/lib/planner"],
  },
]
