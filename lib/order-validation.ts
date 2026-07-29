/** Единые правила валидации заказа (клиент + API + webhook). */

export const MIN_ORDER_TITLE_LENGTH = 5
export const MIN_ORDER_DESCRIPTION_LENGTH = 30

export type OrderFieldsInput = {
  title?: string | null
  description?: string | null
  category?: string | null
}

export type OrderValidationResult =
  | { ok: true; title: string; description: string; category: string }
  | { ok: false; error: string }

export function validateOrderFields(input: OrderFieldsInput): OrderValidationResult {
  const title = (input.title ?? '').trim()
  const description = (input.description ?? '').trim()
  const category = (input.category ?? '').trim()

  if (!title || !description || !category) {
    return { ok: false, error: 'Заполните обязательные поля заказа' }
  }
  if (title.length < MIN_ORDER_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Заголовок слишком короткий. Минимум ${MIN_ORDER_TITLE_LENGTH} символов`,
    }
  }
  if (description.length < MIN_ORDER_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Описание слишком короткое. Минимум ${MIN_ORDER_DESCRIPTION_LENGTH} символов — опишите задачу подробнее`,
    }
  }

  return { ok: true, title, description, category }
}
