export interface IconEntry {
  key: string
  label: string
  category: 'wedding' | 'nature' | 'decorative' | 'misc'
  // lucide icon name (PascalCase) or 'svg:<path-data>' for custom SVGs
  source: string
}

export const ICON_REGISTRY: IconEntry[] = [
  // Wedding
  { key: 'heart', label: 'Heart', category: 'wedding', source: 'Heart' },
  { key: 'ring', label: 'Ring', category: 'wedding', source: 'Ring' },
  { key: 'crown', label: 'Crown', category: 'wedding', source: 'Crown' },
  { key: 'gem', label: 'Gem', category: 'wedding', source: 'Gem' },
  { key: 'gift', label: 'Gift', category: 'wedding', source: 'Gift' },
  {
    key: 'glass-water',
    label: 'Champagne',
    category: 'wedding',
    source: 'GlassWater',
  },
  { key: 'cake', label: 'Cake', category: 'wedding', source: 'Cake' },
  { key: 'music', label: 'Music', category: 'wedding', source: 'Music' },
  // Nature
  { key: 'flower', label: 'Flower', category: 'nature', source: 'Flower' },
  { key: 'flower-2', label: 'Flower 2', category: 'nature', source: 'Flower2' },
  { key: 'leaf', label: 'Leaf', category: 'nature', source: 'Leaf' },
  { key: 'tree', label: 'Tree', category: 'nature', source: 'TreePine' },
  { key: 'sun', label: 'Sun', category: 'nature', source: 'Sun' },
  { key: 'moon', label: 'Moon', category: 'nature', source: 'Moon' },
  { key: 'cloud', label: 'Cloud', category: 'nature', source: 'Cloud' },
  // Decorative
  { key: 'star', label: 'Star', category: 'decorative', source: 'Star' },
  {
    key: 'sparkles',
    label: 'Sparkles',
    category: 'decorative',
    source: 'Sparkles',
  },
  {
    key: 'diamond',
    label: 'Diamond',
    category: 'decorative',
    source: 'Diamond',
  },
  { key: 'zap', label: 'Zap', category: 'decorative', source: 'Zap' },
  // Misc
  { key: 'map-pin', label: 'Location', category: 'misc', source: 'MapPin' },
  { key: 'calendar', label: 'Calendar', category: 'misc', source: 'Calendar' },
  { key: 'clock', label: 'Clock', category: 'misc', source: 'Clock' },
  { key: 'mail', label: 'Mail', category: 'misc', source: 'Mail' },
  { key: 'phone', label: 'Phone', category: 'misc', source: 'Phone' },
]

export const VALID_ICON_KEYS = new Set(ICON_REGISTRY.map((i) => i.key))

export function getIconEntry(key: string): IconEntry | undefined {
  return ICON_REGISTRY.find((i) => i.key === key)
}

export const ICON_CATEGORIES = [
  'wedding',
  'nature',
  'decorative',
  'misc',
] as const satisfies IconEntry['category'][]
