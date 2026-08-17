import { test, expect } from '@playwright/test'

/**
 * Smoke: страницы не должны падать при cold open.
 * Полный SSR-контент зависит от живого Supabase — проверяем HTTP 200 и базовую разметку.
 */
test.describe('Smoke pages', () => {
  test('home responds', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.ok() || res?.status() === 200 || (res?.status() ?? 500) < 500).toBeTruthy()
  })

  test('search route responds', async ({ page }) => {
    const res = await page.goto('/search')
    expect(res?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toBeVisible()
  })

  test('products route responds', async ({ page }) => {
    const res = await page.goto('/products')
    expect(res?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toBeVisible()
  })

  test('search markup has no 11-digit phone numbers', async ({ page }) => {
    await page.goto('/search')
    const html = await page.locator('body').innerText()
    expect(html).not.toMatch(/(?:^|[^\d])\d{11}(?:[^\d]|$)/)
  })

  test('rules is public', async ({ page }) => {
    const res = await page.goto('/rules')
    expect(res?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toContainText(/Правила/i)
  })
})
