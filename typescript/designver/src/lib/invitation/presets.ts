import type { Design } from '#/lib/invitation/types'

export interface Preset {
  id: string
  label: string
  description: string
  colorScheme: string
  design: Design
}

const emptyPart = () => ({
  front: [] as Design['parts']['invitation']['front'],
  back: [] as Design['parts']['invitation']['back'],
})

// Invitation card: 585×830. Fields are positioned in card-px.
export const PRESETS: Preset[] = [
  {
    id: 'centered-classic',
    label: 'Centered Classic',
    description: 'Timeless centered layout with ornamental separator',
    colorScheme: 'cream-gold',
    design: {
      version: 1,
      colorScheme: 'cream-gold',
      defaultFontId: 'playfair',
      enabledParts: { extra: true, envelope: true },
      parts: {
        invitation: {
          front: [
            {
              type: 'text',
              id: 'f1',
              content: 'Together with their families',
              format: { fontSize: 14, italic: true, textAlign: 'center' },
              geom: { x: 67, y: 120, w: 450, h: 36 },
            },
            {
              type: 'separator',
              id: 'f2',
              style: 'diamond',
              thickness: 0.5,
              geom: { x: 192, y: 170, w: 200, h: 24 },
            },
            {
              type: 'text',
              id: 'f3',
              content: 'Anna & Jakub',
              format: { fontSize: 52, bold: false, textAlign: 'center' },
              geom: { x: 42, y: 210, w: 500, h: 90 },
            },
            {
              type: 'separator',
              id: 'f4',
              style: 'line',
              thickness: 0.5,
              geom: { x: 142, y: 320, w: 300, h: 20 },
            },
            {
              type: 'text',
              id: 'f5',
              content:
                'request the honour of your presence\nat the celebration of their marriage',
              format: { fontSize: 16, textAlign: 'center' },
              geom: { x: 67, y: 355, w: 450, h: 64 },
            },
            {
              type: 'text',
              id: 'f6',
              content: 'Saturday, the 14th of June 2025',
              format: { fontSize: 18, italic: true, textAlign: 'center' },
              geom: { x: 67, y: 450, w: 450, h: 40 },
            },
            {
              type: 'text',
              id: 'f7',
              content: "at four o'clock in the afternoon",
              format: { fontSize: 15, textAlign: 'center' },
              geom: { x: 67, y: 498, w: 450, h: 36 },
            },
            {
              type: 'separator',
              id: 'f8',
              style: 'heart',
              thickness: 0.5,
              geom: { x: 192, y: 548, w: 200, h: 24 },
            },
            {
              type: 'text',
              id: 'f9',
              content: 'Pałac Mała Wieś\nBiałobrzegi, Poland',
              format: { fontSize: 16, textAlign: 'center' },
              geom: { x: 92, y: 584, w: 400, h: 52 },
            },
            {
              type: 'text',
              id: 'f10',
              content: 'RSVP by May 1st · hello@example.com',
              format: { fontSize: 12, textAlign: 'center' },
              geom: { x: 92, y: 750, w: 400, h: 30 },
            },
          ],
          back: [],
        },
        extra: emptyPart(),
        envelope: emptyPart(),
      },
    },
  },
  {
    id: 'minimal-modern',
    label: 'Minimal Modern',
    description: 'Clean left-aligned layout on pure white',
    colorScheme: 'pure-white',
    design: {
      version: 1,
      colorScheme: 'pure-white',
      defaultFontId: 'inter',
      enabledParts: { extra: true, envelope: true },
      parts: {
        invitation: {
          front: [
            {
              type: 'text',
              id: 'f1',
              content: 'YOU ARE INVITED',
              format: {
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'left',
                letterSpacing: 4,
              } as never,
              geom: { x: 64, y: 110, w: 300, h: 28 },
            },
            {
              type: 'separator',
              id: 'f2',
              style: 'line',
              thickness: 2,
              geom: { x: 64, y: 154, w: 458, h: 20 },
            },
            {
              type: 'text',
              id: 'f3',
              content: 'Anna\n& Jakub',
              format: { fontSize: 64, fontWeight: 300, textAlign: 'left' },
              geom: { x: 60, y: 180, w: 460, h: 160 },
            },
            {
              type: 'text',
              id: 'f4',
              content: '14.06.2025',
              format: { fontSize: 20, fontWeight: 300, textAlign: 'left' },
              geom: { x: 64, y: 370, w: 300, h: 44 },
            },
            {
              type: 'text',
              id: 'f5',
              content: 'Pałac Mała Wieś, Białobrzegi',
              format: { fontSize: 16, fontWeight: 300, textAlign: 'left' },
              geom: { x: 64, y: 424, w: 400, h: 36 },
            },
            {
              type: 'separator',
              id: 'f6',
              style: 'line',
              thickness: 0.5,
              geom: { x: 64, y: 490, w: 458, h: 20 },
            },
            {
              type: 'text',
              id: 'f7',
              content: 'Please RSVP by May 1st\nhello@example.com',
              format: { fontSize: 13, fontWeight: 300, textAlign: 'left' },
              geom: { x: 64, y: 520, w: 400, h: 56 },
            },
          ],
          back: [],
        },
        extra: emptyPart(),
        envelope: emptyPart(),
      },
    },
  },
  {
    id: 'floral-romance',
    label: 'Floral Romance',
    description: 'Romantic layout with floral icons and blush tones',
    colorScheme: 'blush',
    design: {
      version: 1,
      colorScheme: 'blush',
      defaultFontId: 'cormorant',
      enabledParts: { extra: true, envelope: true },
      parts: {
        invitation: {
          front: [
            {
              type: 'icon',
              id: 'f1',
              iconKey: 'flower',
              geom: { x: 242, y: 60, w: 100, h: 100 },
            },
            {
              type: 'text',
              id: 'f2',
              content: 'Anna & Jakub',
              format: { fontSize: 48, italic: true, textAlign: 'center' },
              geom: { x: 42, y: 180, w: 500, h: 80 },
            },
            {
              type: 'separator',
              id: 'f3',
              style: 'flower',
              thickness: 0.5,
              geom: { x: 192, y: 272, w: 200, h: 24 },
            },
            {
              type: 'text',
              id: 'f4',
              content: 'invite you to celebrate\ntheir wedding day',
              format: { fontSize: 18, textAlign: 'center' },
              geom: { x: 92, y: 310, w: 400, h: 64 },
            },
            {
              type: 'text',
              id: 'f5',
              content: '14th of June, 2025',
              format: { fontSize: 22, italic: true, textAlign: 'center' },
              geom: { x: 67, y: 400, w: 450, h: 44 },
            },
            {
              type: 'text',
              id: 'f6',
              content: "at four o'clock · Pałac Mała Wieś",
              format: { fontSize: 16, textAlign: 'center' },
              geom: { x: 67, y: 454, w: 450, h: 36 },
            },
            {
              type: 'separator',
              id: 'f7',
              style: 'heart',
              thickness: 0.5,
              geom: { x: 192, y: 510, w: 200, h: 24 },
            },
            {
              type: 'text',
              id: 'f8',
              content: 'RSVP · hello@example.com',
              format: { fontSize: 13, textAlign: 'center' },
              geom: { x: 92, y: 550, w: 400, h: 30 },
            },
            {
              type: 'icon',
              id: 'f9',
              iconKey: 'flower-2',
              geom: { x: 242, y: 680, w: 100, h: 100 },
            },
          ],
          back: [],
        },
        extra: emptyPart(),
        envelope: emptyPart(),
      },
    },
  },
]

export const PRESET_IDS = PRESETS.map((p) => p.id)

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
