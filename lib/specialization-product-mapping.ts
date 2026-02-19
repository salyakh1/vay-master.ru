/**
 * Маппинг специализаций мастеров на категории и подкатегории товаров
 * Используется для рекомендаций товаров мастерам по их специализациям
 */

export interface SpecializationProductMapping {
  // Slug специализации
  specializationSlug: string
  // Slug категорий товаров
  categorySlugs: string[]
  // Slug подкатегорий товаров (опционально, для более точных рекомендаций)
  subcategorySlugs?: string[]
}

/**
 * Маппинг специализаций на категории товаров
 * Ключ: slug специализации
 * Значение: массив slug категорий и подкатегорий товаров
 */
export const SPECIALIZATION_TO_PRODUCT_CATEGORIES: Record<string, {
  categories: string[]
  subcategories?: string[]
}> = {
  // Кровля и водосток
  'roofing-gutter': {
    categories: ['lumber-panels', 'roofing-gutters', 'fasteners-hardware'],
    subcategories: [
      // Пиломатериалы
      'lumber-timber',
      'lumber-boards',
      'lumber-osb',
      // Кровля
      'roofing-gutters-metal-tiles',
      'roofing-gutters-proflist',
      'roofing-gutters-shingles',
      'roofing-gutters-membranes',
      'roofing-gutters-snow-guards',
      'roofing-gutters-pipes',
      'roofing-gutters-funnels-gutters',
      // Крепеж
      'fasteners-screws',
      'fasteners-nails',
      'fasteners-anchors',
      'fasteners-bolts',
    ],
  },

  // Сантехника
  'plumbing': {
    categories: ['plumbing-water-supply', 'sewer-septic', 'fasteners-hardware', 'power-tools', 'hand-tools'],
    subcategories: [
      // Сантехника
      'plumbing-pipes',
      'plumbing-fittings',
      'plumbing-faucets',
      'plumbing-water-heaters',
      'plumbing-pumps',
      'plumbing-filters',
      // Канализация
      'sewer-pipes',
      'sewer-fittings',
      'sewer-septics',
      // Крепеж
      'fasteners-screws',
      'fasteners-anchors',
      'fasteners-clamps',
    ],
  },

  // Электромонтаж
  'electrical': {
    categories: ['electrical-lighting', 'low-voltage-smart-home', 'power-tools', 'hand-tools', 'fasteners-hardware'],
    subcategories: [
      // Электрика
      'electrical-cable',
      'electrical-switches',
      'electrical-outlets',
      'electrical-panels-breakers',
      'electrical-lighting-fixtures',
      'electrical-sensors',
      // Слаботочка
      'smart-home-structured-cabling',
      'smart-home-sensors',
    ],
  },

  // Кладка и каменщик
  'masonry': {
    categories: ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'fasteners-hardware', 'hand-tools'],
    subcategories: [
      // Кирпич и блоки
      'masonry-ceramic-brick',
      'masonry-silicate-brick',
      'masonry-aerated-block',
      'masonry-foam-block',
      // Смеси
      'building-mixes-cement',
      'building-mixes-masonry',
      'building-mixes-plaster',
      // Сыпучие
      'bulk-sand',
      'bulk-gravel',
      'bulk-pgs',
    ],
  },

  // Штукатурка и шпатлевка
  'plaster': {
    categories: ['building-mixes', 'finishing-materials', 'hand-tools', 'power-tools'],
    subcategories: [
      'building-mixes-plaster',
      'building-mixes-putty',
      'building-mixes-primers',
      'finishing-drywall',
      'finishing-adhesives-primers',
    ],
  },

  // Стяжка и наливной пол
  'floor-screed': {
    categories: ['building-mixes', 'bulk-materials', 'power-tools', 'hand-tools'],
    subcategories: [
      'building-mixes-cement',
      'building-mixes-self-leveling',
      'building-mixes-screed',
      'bulk-sand',
      'bulk-gravel',
    ],
  },

  // Гипсокартон и перегородки
  'drywall': {
    categories: ['lumber-panels', 'fasteners-hardware', 'building-mixes', 'hand-tools', 'power-tools'],
    subcategories: [
      'lumber-osb',
      'lumber-plywood',
      'fasteners-screws',
      'fasteners-dowels',
      'building-mixes-putty',
      'building-mixes-primers',
    ],
  },

  // Малярные работы
  'painting-walls': {
    categories: ['finishing-materials', 'building-mixes', 'hand-tools', 'power-tools'],
    subcategories: [
      'finishing-paints',
      'finishing-adhesives-primers',
      'building-mixes-primers',
      'building-mixes-putty',
    ],
  },

  // Плитка и камень
  'tile-stone': {
    categories: ['tile-stone', 'building-mixes', 'fasteners-hardware', 'hand-tools', 'power-tools'],
    subcategories: [
      'tile-ceramic',
      'tile-porcelain',
      'tile-mosaic',
      'tile-natural-stone',
      'building-mixes-tile-adhesive',
      'building-mixes-grout',
    ],
  },

  // Паркет/ламинат
  'flooring': {
    categories: ['flooring', 'building-mixes', 'hand-tools', 'power-tools'],
    subcategories: [
      'flooring-laminate',
      'flooring-parquet',
      'building-mixes-primers',
      'building-mixes-putty',
      'flooring-finishes',
    ],
  },

  // Фасадные работы
  'facade': {
    categories: ['facades-cladding', 'insulation', 'waterproofing-sealants', 'fasteners-hardware', 'building-mixes'],
    subcategories: [
      'facades-cladding-siding',
      'facades-cladding-panels',
      'facades-cladding-decor-plaster',
      'insulation-mineral-wool',
      'insulation-polystyrene',
      'waterproofing-roll',
      'waterproofing-coating',
    ],
  },

  // Заборы и ворота
  'fences-gates': {
    categories: ['fences-gates', 'metalworks-welding-materials', 'fasteners-hardware', 'power-tools'],
    subcategories: [
      'fences-proflist',
      'fences-pickets',
      'fences-chain-link',
      'fences-posts-rails',
      'gates-swing',
      'gates-sliding',
      'metalworks-profile-pipes',
      'metalworks-sheet',
    ],
  },

  // Металлоконструкции и сварка
  'metal-welding': {
    categories: ['metalworks-welding-materials', 'power-tools', 'hand-tools', 'fasteners-hardware'],
    subcategories: [
      'metalworks-profile-pipes',
      'metalworks-rebar',
      'metalworks-sheet',
      'metalworks-angles-channels',
      'metalworks-electrodes',
      'metalworks-wire',
    ],
  },

  // Отопление
  'heating': {
    categories: ['heating-boilers', 'plumbing-water-supply', 'fasteners-hardware', 'power-tools'],
    subcategories: [
      'heating-boilers-devices',
      'heating-radiators',
      'heating-pipes',
      'heating-fittings',
      'plumbing-pipes',
      'plumbing-fittings',
    ],
  },

  // Вентиляция и кондиционирование
  'hvac': {
    categories: ['ventilation-ac', 'electrical-lighting', 'fasteners-hardware', 'power-tools'],
    subcategories: [
      'ventilation-ducts',
      'ventilation-fans',
      'ventilation-filters',
      'ventilation-splits',
      'ventilation-mobile-ac',
    ],
  },

  // Окна и двери
  'windows-doors': {
    categories: ['windows-doors-hardware', 'fasteners-hardware', 'building-mixes', 'hand-tools'],
    subcategories: [
      'windows-pvc',
      'windows-aluminum',
      'doors-interior',
      'doors-entry',
      'doors-hardware',
      'windows-hardware',
    ],
  },

  // Благоустройство участка
  'landscaping': {
    categories: ['landscaping-outdoor', 'bulk-materials', 'fences-gates', 'hand-tools'],
    subcategories: [
      'landscaping-pavers',
      'landscaping-curbs',
      'landscaping-geotextile',
      'landscaping-drainage',
      'bulk-sand',
      'bulk-gravel',
    ],
  },

  // Септики и канализация
  'septic-drain': {
    categories: ['sewer-septic', 'plumbing-water-supply', 'bulk-materials', 'fasteners-hardware'],
    subcategories: [
      'sewer-septics',
      'sewer-pipes',
      'sewer-fittings',
      'plumbing-pipes',
      'bulk-sand',
      'bulk-gravel',
    ],
  },

  // Водоснабжение и скважины
  'water-supply': {
    categories: ['plumbing-water-supply', 'electrical-lighting', 'fasteners-hardware', 'power-tools'],
    subcategories: [
      'plumbing-pipes',
      'plumbing-pumps',
      'plumbing-filters',
      'plumbing-fittings',
      'electrical-cable',
    ],
  },

  // Общестроительные работы
  'general-construction': {
    categories: ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'lumber-panels', 'fasteners-hardware', 'power-tools', 'hand-tools'],
  },

  // Фундамент и бетон
  'foundation-concrete': {
    categories: ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'metalworks-welding-materials', 'power-tools'],
    subcategories: [
      'masonry-fbs',
      'building-mixes-cement',
      'building-mixes-sand-concrete',
      'bulk-sand',
      'bulk-gravel',
      'bulk-pgs',
      'metalworks-rebar',
    ],
  },

  // Автосервис общий
  'autoservice-common': {
    categories: ['auto-parts-engine-gearbox', 'auto-parts-suspension-brakes', 'auto-electronics', 'auto-chemicals-detailing', 'power-tools', 'hand-tools'],
  },

  // Двигатель и моторист
  'engine-motor': {
    categories: ['auto-parts-engine-gearbox', 'auto-chemicals-detailing', 'power-tools', 'hand-tools'],
  },

  // Трансмиссия и КПП
  'transmission-gearbox': {
    categories: ['auto-parts-engine-gearbox', 'auto-chemicals-detailing', 'power-tools', 'hand-tools'],
  },

  // Подвеска и рулевое
  'suspension-steering': {
    categories: ['auto-parts-suspension-brakes', 'auto-chemicals-detailing', 'power-tools', 'hand-tools'],
  },

  // Тормозная система
  'brake-system': {
    categories: ['auto-parts-suspension-brakes', 'auto-chemicals-detailing', 'power-tools', 'hand-tools'],
  },

  // Автоэлектрика
  'auto-electric': {
    categories: ['auto-electronics', 'power-tools', 'hand-tools', 'fasteners-hardware'],
  },

  // Кузовной ремонт
  'body-repair': {
    categories: ['auto-chemicals-detailing', 'power-tools', 'hand-tools', 'fasteners-hardware'],
  },

  // Кузовная сварка
  'body-welding': {
    categories: ['metalworks-welding-materials', 'power-tools', 'hand-tools'],
    subcategories: [
      'metalworks-sheet',
      'metalworks-electrodes',
      'metalworks-wire',
    ],
  },

  // Покраска и малярка
  'painting': {
    categories: ['auto-chemicals-detailing', 'finishing-materials', 'power-tools', 'hand-tools'],
    subcategories: [
      'finishing-paints',
      'finishing-adhesives-primers',
    ],
  },

  // Слаботочка и умный дом
  'low-voltage-smart': {
    categories: ['low-voltage-smart-home', 'electrical-lighting', 'fasteners-hardware', 'hand-tools'],
  },

  // Видео и сигнализация
  'cctv-security': {
    categories: ['low-voltage-smart-home', 'electrical-lighting', 'fasteners-hardware', 'hand-tools'],
  },

  // Демонтаж и алмазное бурение
  'demolition-core': {
    categories: ['power-tools', 'consumables-accessories', 'fasteners-hardware', 'building-mixes', 'hand-tools'],
    subcategories: [
      // Инструменты
      'power-tools-hammers',
      'power-tools-drills-drivers',
      'power-tools-grinders',
      // Расходники
      'consumables-drill-bits',
      'consumables-hammer-bits',
      'consumables-cutting-discs',
      // Крепеж
      'fasteners-anchors',
      'fasteners-dowels',
      'fasteners-bolts',
      // Смеси для заделки
      'building-mixes-cement',
      'building-mixes-putty',
      'building-mixes-primers',
    ],
  },

  // Алмазное бурение (узкая специализация)
  'diamond-drilling': {
    categories: ['power-tools', 'consumables-accessories', 'fasteners-hardware', 'building-mixes', 'hand-tools'],
    subcategories: [
      // Инструменты для алмазного бурения
      'power-tools-hammers',
      'power-tools-drills-drivers',
      'power-tools-compressors',
      // Расходники - алмазные коронки, буры
      'consumables-drill-bits',
      'consumables-hammer-bits',
      'consumables-cutting-discs',
      'consumables-hole-saws',
      // Крепеж для фиксации
      'fasteners-anchors',
      'fasteners-dowels',
      'fasteners-bolts',
      // Смеси для заделки отверстий
      'building-mixes-cement',
      'building-mixes-putty',
      'building-mixes-primers',
    ],
  },
}

/** Маппинг категорий мастеров (верхний уровень) на категории товаров */
export const CATEGORY_SLUG_TO_PRODUCT_CATEGORIES: Record<string, { categories: string[]; subcategories?: string[] }> = {
  stroika: { categories: ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'lumber-panels', 'roofing-gutters', 'fasteners-hardware', 'power-tools', 'hand-tools'] },
  'otdelka-remont': { categories: ['building-mixes', 'finishing-materials', 'tile-stone', 'flooring', 'plumbing-water-supply', 'electrical-lighting', 'power-tools', 'hand-tools'] },
  autoservice: { categories: ['auto-parts-engine-gearbox', 'auto-parts-suspension-brakes', 'auto-electronics', 'auto-chemicals-detailing', 'power-tools', 'hand-tools'] },
  gruzoperevozki: { categories: [] },
  spectehnika: { categories: ['power-tools', 'hand-tools'] },
  blagoustrojstvo: { categories: ['landscaping-outdoor', 'bulk-materials', 'fences-gates', 'hand-tools'] },
  'hudozhestvennaya-kovka': { categories: ['metalworks-welding-materials', 'power-tools', 'hand-tools'] },
  'prom-alpinizm': { categories: ['power-tools', 'hand-tools', 'fasteners-hardware'] },
  'otkachka-kanalizacii': { categories: ['sewer-septic', 'plumbing-water-supply'] },
  vodosnabzhenie: { categories: ['plumbing-water-supply', 'electrical-lighting', 'power-tools'] },
  klining: { categories: [] },
  'master-na-chas': { categories: ['power-tools', 'hand-tools', 'fasteners-hardware'] },
  'ohrana-bezopasnost': { categories: ['low-voltage-smart-home', 'electrical-lighting'] },
  'vyvoz-musora': { categories: [] },
  gruzchiki: { categories: [] },
  raznorabochye: { categories: ['power-tools', 'hand-tools', 'building-mixes', 'bulk-materials'] },
  avtopodbor: { categories: [] },
  avtoperevozki: { categories: [] },
  'remont-tehniki': { categories: ['power-tools', 'hand-tools'] },
  'dizajn-proektirovanie': { categories: [] },
  specoborudovanie: { categories: ['power-tools', 'metalworks-welding-materials', 'consumables-accessories', 'building-mixes', 'hand-tools'] },
}

/**
 * Маппинг подкатегорий мастеров (slug) на категории и подкатегории товаров.
 * Если подкатегории нет в маппинге — используются категории товаров родительской категории (fallback).
 */
export const SUBCATEGORY_SLUG_TO_PRODUCT_CATEGORIES: Record<string, {
  categories: string[]
  subcategories?: string[]
}> = {
  // Пример: можно добавлять slug подкатегорий для более точного подбора товаров.
  // Пока пусто — везде используется fallback по родительской категории.
}

export function getProductCategoriesForCategorySlugs(
  categorySlugs: string[]
): { categorySlugs: string[]; subcategorySlugs: string[] } {
  const categorySlugsSet = new Set<string>()
  const subcategorySlugsSet = new Set<string>()
  for (const slug of categorySlugs) {
    const mapping = CATEGORY_SLUG_TO_PRODUCT_CATEGORIES[slug]
    if (mapping) {
      mapping.categories.forEach((c) => categorySlugsSet.add(c))
      if (mapping.subcategories) mapping.subcategories.forEach((s) => subcategorySlugsSet.add(s))
    }
  }
  return { categorySlugs: Array.from(categorySlugsSet), subcategorySlugs: Array.from(subcategorySlugsSet) }
}

/**
 * Получить категории и подкатегории товаров для подкатегорий мастеров.
 * Если для подкатегории есть маппинг — используются он, иначе — маппинг родительской категории (categorySlugsFallback).
 */
export function getProductCategoriesForMasterSubcategorySlugs(
  subcategorySlugs: string[],
  categorySlugsFallback: string[]
): { categorySlugs: string[]; subcategorySlugs: string[] } {
  const categorySlugsSet = new Set<string>()
  const subcategorySlugsSet = new Set<string>()
  let hasSubMapping = false
  for (const slug of subcategorySlugs) {
    const mapping = SUBCATEGORY_SLUG_TO_PRODUCT_CATEGORIES[slug]
    if (mapping && (mapping.categories.length > 0 || (mapping.subcategories?.length ?? 0) > 0)) {
      hasSubMapping = true
      mapping.categories.forEach((c) => categorySlugsSet.add(c))
      if (mapping.subcategories) mapping.subcategories.forEach((s) => subcategorySlugsSet.add(s))
    }
  }
  if (hasSubMapping) {
    return { categorySlugs: Array.from(categorySlugsSet), subcategorySlugs: Array.from(subcategorySlugsSet) }
  }
  return getProductCategoriesForCategorySlugs(categorySlugsFallback)
}

/**
 * Получить категории и подкатегории товаров для специализаций мастера (по slug специализаций или категорий)
 * @param specializationSlugs - массив slug специализаций или категорий мастера
 * @returns объект с массивами categorySlugs и subcategorySlugs
 */
export function getProductCategoriesForSpecializations(
  specializationSlugs: string[]
): { categorySlugs: string[]; subcategorySlugs: string[] } {
  const byCategory = getProductCategoriesForCategorySlugs(specializationSlugs)
  if (byCategory.categorySlugs.length > 0 || byCategory.subcategorySlugs.length > 0) return byCategory
  const categorySlugsSet = new Set<string>()
  const subcategorySlugsSet = new Set<string>()
  for (const slug of specializationSlugs) {
    const mapping = SPECIALIZATION_TO_PRODUCT_CATEGORIES[slug]
    if (mapping) {
      mapping.categories.forEach((cat) => categorySlugsSet.add(cat))
      if (mapping.subcategories) mapping.subcategories.forEach((subcat) => subcategorySlugsSet.add(subcat))
    }
  }
  return {
    categorySlugs: Array.from(categorySlugsSet),
    subcategorySlugs: Array.from(subcategorySlugsSet),
  }
}
