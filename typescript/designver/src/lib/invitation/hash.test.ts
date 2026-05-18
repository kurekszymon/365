import { describe, expect, it } from 'vitest'
import LZString from 'lz-string'
import { decodeDesign, encodeDesign } from '#/lib/invitation/hash'
import type { Design } from '#/lib/invitation/types'

const minimalDesign: Design = {
  version: 1,
  colorScheme: 'cream-gold',
  defaultFontId: 'playfair',
  enabledParts: { extra: true, envelope: true },
  parts: {
    invitation: { front: [], back: [] },
    extra: { front: [], back: [] },
    envelope: { front: [], back: [] },
  },
}

const richDesign: Design = {
  version: 1,
  colorScheme: 'blush',
  defaultFontId: 'cormorant',
  enabledParts: { extra: true, envelope: true },
  parts: {
    invitation: {
      front: [
        {
          type: 'text',
          id: 'f1',
          content: 'Anna & Jakub',
          format: {
            fontSize: 48,
            bold: true,
            italic: false,
            textAlign: 'center',
          },
          geom: { x: 42, y: 200, w: 500, h: 80 },
        },
        {
          type: 'separator',
          id: 'f2',
          style: 'heart',
          thickness: 1,
          geom: { x: 192, y: 290, w: 200, h: 24 },
        },
        {
          type: 'icon',
          id: 'f3',
          iconKey: 'flower',
          color: '#c9728a',
          geom: { x: 242, y: 60, w: 100, h: 100 },
        },
      ],
      back: [
        {
          type: 'text',
          id: 'f4',
          content: 'Thank you for coming',
          geom: { x: 92, y: 300, w: 400, h: 50 },
        },
      ],
    },
    extra: { front: [], back: [] },
    envelope: { front: [], back: [] },
  },
  guests: ['Anna Kowalska', 'Jakub Wiśniewski'],
}

describe('encodeDesign / decodeDesign round-trip', () => {
  it('round-trips minimal design', () => {
    const encoded = encodeDesign(minimalDesign)
    const decoded = decodeDesign(encoded)
    expect(decoded).toEqual(minimalDesign)
  })

  it('round-trips rich design with all field types', () => {
    const encoded = encodeDesign(richDesign)
    const decoded = decodeDesign(encoded)
    expect(decoded).toEqual(richDesign)
  })

  it('handles hash prefix (#)', () => {
    const encoded = encodeDesign(minimalDesign)
    const decoded = decodeDesign('#' + encoded)
    expect(decoded).toEqual(minimalDesign)
  })
})

describe('decodeDesign validation', () => {
  it('returns null for garbage input', () => {
    expect(decodeDesign('notvalid!!!')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeDesign('')).toBeNull()
  })

  it('rejects unknown version', () => {
    const bad = encodeDesign({ ...minimalDesign, version: 99 } as never)
    expect(decodeDesign(bad)).toBeNull()
  })

  it('clamps fontSize out of range', () => {
    const d: Design = {
      ...minimalDesign,
      parts: {
        ...minimalDesign.parts,
        invitation: {
          front: [
            {
              type: 'text',
              id: 'f1',
              content: 'Hello',
              format: { fontSize: 9999 },
              geom: { x: 0, y: 0, w: 100, h: 40 },
            },
          ],
          back: [],
        },
      },
    }
    const encoded = encodeDesign(d)
    const decoded = decodeDesign(encoded)
    expect(decoded?.parts.invitation.front[0]).toBeDefined()
    const field = decoded!.parts.invitation.front[0]
    if (field.type === 'text') {
      expect(field.format?.fontSize).toBeLessThanOrEqual(120)
    }
  })

  it('rejects invalid icon key', () => {
    const d: Design = {
      ...minimalDesign,
      parts: {
        ...minimalDesign.parts,
        invitation: {
          front: [
            {
              type: 'icon',
              id: 'f1',
              iconKey: 'INVALID_KEY_THAT_DOES_NOT_EXIST',
              geom: { x: 0, y: 0, w: 60, h: 60 },
            },
          ],
          back: [],
        },
      },
    }
    const encoded = encodeDesign(d)
    const decoded = decodeDesign(encoded)
    expect(decoded?.parts.invitation.front).toHaveLength(0)
  })

  it('rejects prototype pollution attempts', () => {
    const malicious = `{"__proto__":{"isAdmin":true}}`
    const encoded = LZString.compressToEncodedURIComponent(malicious)
    expect(decodeDesign(encoded)).toBeNull()
  })

  it('falls back to default colorScheme for unknown scheme', () => {
    const d = { ...minimalDesign, colorScheme: 'nonexistent-scheme' } as never
    const encoded = encodeDesign(d)
    const decoded = decodeDesign(encoded)
    expect(decoded?.colorScheme).toBe('cream-gold')
  })

  it('strips guests when not present in hash', () => {
    const encoded = encodeDesign(minimalDesign)
    const decoded = decodeDesign(encoded)
    expect(decoded?.guests).toBeUndefined()
  })

  it('preserves guests when present', () => {
    const encoded = encodeDesign({
      ...minimalDesign,
      guests: ['Anna', 'Jakub'],
    })
    const decoded = decodeDesign(encoded)
    expect(decoded?.guests).toEqual(['Anna', 'Jakub'])
  })

  it('preserves enabledParts when present', () => {
    const encoded = encodeDesign({
      ...minimalDesign,
      enabledParts: { extra: true, envelope: false },
    })
    const decoded = decodeDesign(encoded)
    expect(decoded?.enabledParts).toEqual({ extra: true, envelope: false })
  })
})
