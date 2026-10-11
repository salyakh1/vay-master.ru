/**
 * Реквизиты оператора персональных данных (РФ, 152-ФЗ).
 * Заполните перед публикацией в сторах и на проде.
 */
export const LEGAL_OPERATOR = {
  /** ИП / ООО / самозанятый / физлицо */
  form: 'Указать: ИП / ООО / физлицо',
  name: 'Указать полное наименование оператора',
  inn: 'Указать ИНН',
  ogrn: 'Указать ОГРН / ОГРНИП (если применимо)',
  address: 'Указать юридический / почтовый адрес в РФ',
  pdnEmail: 'support@vay-master.ru',
  supportEmail: 'support@vay-master.ru',
  siteUrl: 'https://vay-master.ru',
  appName: 'VayMaster',
  country: 'Российская Федерация',
  /** Дата редакции документов */
  docsUpdatedAt: '09.10.2026',
} as const

export const LEGAL_LINKS = {
  privacy: '/privacy',
  terms: '/terms',
  offer: '/offer',
  rules: '/rules',
} as const
