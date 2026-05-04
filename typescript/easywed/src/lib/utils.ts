import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClassValue } from "clsx"

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export const omitKey = <T extends object, TKey extends keyof T>(
  obj: T,
  key: TKey
): Omit<T, TKey> => {
  const { [key]: _, ...rest } = obj

  void _ // to silence unused variable warning

  return rest
}
