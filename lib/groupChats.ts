/** Константы профессиональных групповых чатов */
export const GROUP_CHAT_COOLDOWN_MS = 12 * 60 * 60 * 1000
export const GROUP_CHAT_TTL_MS = 48 * 60 * 60 * 1000
export const GROUP_CHAT_TTL_HOURS = 48
export const GROUP_CHAT_COOLDOWN_HOURS = 12

const CATEGORY_ICONS: Record<string, string> = {
  stroika: '🏗️',
  'otdelka-remont': '🖌️',
  autoservice: '🚗',
  gruzoperevozki: '🚛',
  spectehnika: '🚜',
  blagoustrojstvo: '🌳',
  'hudozhestvennaya-kovka': '⚒️',
  'prom-alpinizm': '🧗',
  'otkachka-kanalizacii': '🚽',
  vodosnabzhenie: '💧',
  klining: '✨',
  'master-na-chas': '🔧',
  'ohrana-bezopasnost': '🛡️',
  'vyvoz-musora': '🗑️',
  gruzchiki: '📦',
  avtoperevozki: '🚐',
  raznorabochye: '🛠️',
  avtopodbor: '🔍',
  'remont-tehniki': '🔌',
  'dizajn-proektirovanie': '📐',
  specoborudovanie: '⚙️',
}

export function iconForCategorySlug(slug: string): string {
  return CATEGORY_ICONS[slug] || '💬'
}

export function groupChatName(categoryName: string): string {
  return categoryName
}
