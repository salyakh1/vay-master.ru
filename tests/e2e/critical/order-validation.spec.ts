import { test, expect } from '@playwright/test'
import {
  MIN_ORDER_DESCRIPTION_LENGTH,
  validateOrderFields,
} from '../../../lib/order-validation'

/**
 * Critical-4: описание < 30 символов должно отклоняться единым валидатором
 * (тем же, что используют create-session / notification).
 */
test.describe('Critical: order publication validation', () => {
  test('rejects description shorter than 30 characters', () => {
    const r = validateOrderFields({
      title: 'Нужен сантехник',
      description: 'fix',
      category: 'plumbing',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain(String(MIN_ORDER_DESCRIPTION_LENGTH))
    }
  })

  test('accepts description with 30+ characters', () => {
    const r = validateOrderFields({
      title: 'Нужен сантехник',
      description: 'Нужно заменить смеситель на кухне, желательно сегодня до вечера.',
      category: 'plumbing',
    })
    expect(r.ok).toBe(true)
  })
})
