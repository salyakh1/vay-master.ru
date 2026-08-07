import { describe, expect, it } from 'vitest'
import {
  MIN_ORDER_DESCRIPTION_LENGTH,
  MIN_ORDER_TITLE_LENGTH,
  validateOrderFields,
} from '@/lib/order-validation'

describe('validateOrderFields (Critical-4: server validation contract)', () => {
  it('rejects empty fields', () => {
    const r = validateOrderFields({ title: '', description: '', category: '' })
    expect(r.ok).toBe(false)
  })

  it('rejects title shorter than minimum', () => {
    const r = validateOrderFields({
      title: 'ab',
      description: 'x'.repeat(MIN_ORDER_DESCRIPTION_LENGTH),
      category: 'repair',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Заголовок/i)
  })

  it('rejects description shorter than 30 chars (paid order spam guard)', () => {
    const r = validateOrderFields({
      title: 'Ремонт кухни',
      description: 'коротко',
      category: 'repair',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/Описание/i)
      expect(r.error).toContain(String(MIN_ORDER_DESCRIPTION_LENGTH))
    }
  })

  it('accepts valid payload', () => {
    const r = validateOrderFields({
      title: 'a'.repeat(MIN_ORDER_TITLE_LENGTH),
      description: 'b'.repeat(MIN_ORDER_DESCRIPTION_LENGTH),
      category: 'plumbing',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.title.length).toBeGreaterThanOrEqual(MIN_ORDER_TITLE_LENGTH)
      expect(r.description.length).toBeGreaterThanOrEqual(MIN_ORDER_DESCRIPTION_LENGTH)
    }
  })
})
