import type { ContentIndex, LevelData } from "./types"

const indexCache: { data: ContentIndex | null } = { data: null }
const levelCache = new Map<string, LevelData>()

export async function fetchContentIndex(): Promise<ContentIndex> {
  if (indexCache.data) return indexCache.data
  const res = await fetch("/content/index.json")
  const data: ContentIndex = await res.json()
  indexCache.data = data
  return data
}

export async function fetchLevel(file: string): Promise<LevelData> {
  const cached = levelCache.get(file)
  if (cached) return cached
  const res = await fetch(`/content/${file}`)
  const data: LevelData = await res.json()
  levelCache.set(file, data)
  return data
}
