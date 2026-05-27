export interface LocalizedString {
  en: string
  pl: string
  [key: string]: string
}

export interface Card {
  id: string
  source: LocalizedString
  target: string
  newWords: string[]
  notes?: LocalizedString
}

export interface LevelData {
  id: string
  cards: Card[]
}

export interface LevelMeta {
  id: string
  order: number
  title: LocalizedString
  description: LocalizedString
  newWords: string[]
  cardCount: number
  file: string
}

export interface ContentIndex {
  version: number
  targetLanguage: string
  levels: LevelMeta[]
}

export interface CardStats {
  seen: number
  correct: number
  streak: number
  lastSeen: string
  lastCorrect: string | null
}

export type LevelStatus = "locked" | "in-progress" | "completed"

export interface LevelProgress {
  status: LevelStatus
  cardsSeen: number
  totalCards: number
  completedAt: string | null
}

export interface ProgressState {
  version: 1
  cards: Record<string, CardStats>
  levels: Record<string, LevelProgress>
  lastActivity: string
}

export type SourceLanguage = "en" | "pl"
export type UILanguage = "en" | "pl"
