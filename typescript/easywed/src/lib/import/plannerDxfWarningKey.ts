import type { ImportWarning } from "@/lib/import/plannerDxf"

export const warningKey = (code: ImportWarning["code"]): string =>
  `import.dxf.warning.${code}`
