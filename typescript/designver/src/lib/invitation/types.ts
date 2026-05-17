export type PartId = 'invitation' | 'extra' | 'envelope'
export type Side = 'front' | 'back'

export interface FieldFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontSize?: number // 6–120
  fontWeight?: number // 100–900
  fontId?: string
  textAlign?: 'left' | 'center' | 'right'
  color?: string // hex
}

export interface FieldGeometry {
  x: number
  y: number
  w: number
  h: number
}

export type SeparatorStyle = 'line' | 'heart' | 'flower' | 'star' | 'diamond'
export type SeparatorThickness = 0.5 | 1 | 2 | 3

export interface TextField {
  type: 'text'
  id: string
  content: string
  format?: FieldFormat
  geom: FieldGeometry
}

export interface SeparatorField {
  type: 'separator'
  id: string
  style: SeparatorStyle
  thickness: SeparatorThickness
  geom: FieldGeometry
}

export interface IconField {
  type: 'icon'
  id: string
  iconKey: string
  color?: string
  geom: FieldGeometry
}

export type Field = TextField | SeparatorField | IconField

export interface PartContent {
  front: Field[]
  back: Field[]
}

export interface Design {
  version: 1
  parts: Record<PartId, PartContent>
  colorScheme: string
  defaultFontId: string
  guests?: string[] // only serialized when user opts in
}

export interface EditorUIState {
  activePart: PartId
  activeSide: Side
  selectedId: string | null
  editingId: string | null
  gridEnabled: boolean
  gridSize: number
  zoom: number
  guestSidebarOpen: boolean
  includeGuestsInHash: boolean
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'
