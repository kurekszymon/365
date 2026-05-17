import { describe, expect, it } from 'vitest'
import {
  GUEST_LIST_MAX_SIZE,
  GUEST_NAME_MAX_LENGTH,
  sanitizeGuestName,
  sanitizeGuestNames,
} from '#/lib/invitation/guestNames'

describe('sanitizeGuestName', () => {
  it('trims whitespace', () => {
    expect(sanitizeGuestName('  Anna  ')).toBe('Anna')
  })

  it('caps at max length', () => {
    const long = 'a'.repeat(GUEST_NAME_MAX_LENGTH + 50)
    expect(sanitizeGuestName(long)).toHaveLength(GUEST_NAME_MAX_LENGTH)
  })

  it('returns empty string for blank input', () => {
    expect(sanitizeGuestName('   ')).toBe('')
  })
})

describe('sanitizeGuestNames', () => {
  it('drops blank entries', () => {
    expect(sanitizeGuestNames(['Anna', '', '  ', 'Jakub'])).toEqual([
      'Anna',
      'Jakub',
    ])
  })

  it('limits to max list size', () => {
    const names = Array.from(
      { length: GUEST_LIST_MAX_SIZE + 10 },
      (_, i) => `Guest ${i}`,
    )
    expect(sanitizeGuestNames(names)).toHaveLength(GUEST_LIST_MAX_SIZE)
  })

  it('trims each name', () => {
    expect(sanitizeGuestNames(['  Anna  ', ' Jakub '])).toEqual([
      'Anna',
      'Jakub',
    ])
  })
})
