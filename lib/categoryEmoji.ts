/** Уникальные emoji для категорий мастеров (slug / name). */
const MASTER_RULES: Array<[RegExp, string]> = [
  [/электр|провод|освещ|розет|свет/i, '⚡'],
  [/сантех|вод|канал|смесит|труб/i, '🚿'],
  [/строй|фундам|бетон|кладк|монолит/i, '🏗️'],
  [/отдел|штукат|плит|обои|шпакл|покрас/i, '🎨'],
  [/окн|остекл|балкон|двер/i, '🪟'],
  [/кров|крыш|череп/i, '🏠'],
  [/ландшафт|сад|газон|озелен/i, '🌿'],
  [/мебел|сборк|кухн/i, '🪑'],
  [/убор|клининг|чист/i, '🧹'],
  [/кондиц|вентил|отопл|климат/i, '❄️'],
  [/свар|металл|кован/i, '🔩'],
  [/плот|столяр|дерев/i, '🪵'],
  [/ремонт|отделк/i, '🔧'],
  [/демонт|снос/i, '💥'],
  [/быт|техник|стирал|холод/i, '📺'],
  [/компью|it|софт|програм/i, '💻'],
  [/авто|машин|шин/i, '🚗'],
  [/перевоз|груз|такси/i, '🚚'],
  [/юрид|бухгал|документ/i, '📄'],
  [/фото|видео|съём/i, '📷'],
  [/красот|маник|парик|стриж/i, '💅'],
  [/обуч|репет|курс/i, '📚'],
  [/охран|безопас|сигнал/i, '🔒'],
  [/натяжн|потол/i, '⬜'],
  [/изоляц|утепл/i, '🧱'],
  [/плитк|керам/i, '🟫'],
]

/** Emoji для категорий товаров. */
const PRODUCT_RULES: Array<[RegExp, string]> = [
  [/инструмент|tool/i, '🔨'],
  [/материал|строймат|сух|смес/i, '🧱'],
  [/креп|метиз|саморез|болт/i, '🔩'],
  [/электр|кабел|розет/i, '⚡'],
  [/сантех|труб|смесит/i, '🚿'],
  [/краск|лак|эмаль/i, '🎨'],
  [/обои|отдел/i, '🖼️'],
  [/защит|перчат|очк/i, '🦺'],
  [/сад|огород/i, '🌱'],
  [/авто|масл/i, '🛞'],
]

function matchRules(text: string, rules: Array<[RegExp, string]>, fallback: string): string {
  for (const [re, emoji] of rules) {
    if (re.test(text)) return emoji
  }
  return fallback
}

export function getCategoryEmoji(slug?: string | null, name?: string | null): string {
  const text = `${slug ?? ''} ${name ?? ''}`.trim()
  if (!text) return '📋'
  return matchRules(text, MASTER_RULES, '📋')
}

export function getProductCategoryEmoji(slug?: string | null, name?: string | null): string {
  const text = `${slug ?? ''} ${name ?? ''}`.trim()
  if (!text) return '🛒'
  const product = matchRules(text, PRODUCT_RULES, '')
  if (product) return product
  return getCategoryEmoji(slug, name) === '📋' ? '🛒' : getCategoryEmoji(slug, name)
}
