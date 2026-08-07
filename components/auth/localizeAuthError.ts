/** Сообщения ошибок Supabase Auth на русском (для login/register). */
export function localizeAuthError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw || '')
  const lower = msg.toLowerCase()

  if (!msg.trim()) return 'Что-то пошло не так. Попробуйте ещё раз.'

  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Этот email уже зарегистрирован. Войдите или восстановите пароль.'
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'Пароль слишком короткий. Минимум 6 символов.'
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Проверьте правильность email.'
  }
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Email не подтверждён. Проверьте почту.'
  }
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'Неверный email или пароль.'
  }
  if (lower.includes('signup is disabled')) {
    return 'Регистрация временно отключена. Попробуйте позже.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('err_')
  ) {
    return 'Нет связи с сервером. Проверьте интернет.'
  }

  // Не показываем сырой английский текст пользователю
  if (/[a-z]{4,}/i.test(msg) && !/[а-яё]/i.test(msg)) {
    return 'Не удалось выполнить действие. Проверьте данные и попробуйте снова.'
  }

  return msg
}
