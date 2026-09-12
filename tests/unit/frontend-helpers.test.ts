import { describe, expect, it } from 'vitest'
import { haversineKm } from '@/lib/geo'
import { getInitials, getMasterAvatarAlt } from '@/lib/master-display'
import { localizeAuthError } from '@/components/auth/localizeAuthError'

import { getTrialEndsAt, getTrialStartAt, isProActive } from '@/lib/masterAccess'
import {
  buildProductInterestMessage,
  hasProductContextMessage,
  stripProductPathFromContent,
} from '@/components/chats/chat-utils'
import {
  getProductCategoriesForMasterSubcategorySlugs,
  SUBCATEGORY_SLUG_TO_PRODUCT_CATEGORIES,
} from '@/lib/specialization-product-mapping'
import { interleaveByCategoryOrder, normalizeCity } from '@/lib/product-task-rank'

describe('geo + master-display + auth errors', () => {
  it('haversine is ~0 for same point', () => {
    expect(haversineKm(55.75, 37.62, 55.75, 37.62)).toBeCloseTo(0, 5)
  })

  it('getInitials never returns undefined', () => {
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('')).toBe('?')
    expect(getInitials('Иван Петров')).toMatch(/И|П/)
  })

  it('avatar alt never becomes "undefined"', () => {
    expect(getMasterAvatarAlt(undefined)).not.toBe('undefined')
    expect(getMasterAvatarAlt(null)).toMatch(/мастер/i)
  })

  it('localizes known Supabase auth errors', () => {
    expect(localizeAuthError('User already registered')).toMatch(/зарегистрирован/i)
    expect(localizeAuthError('Password should be at least 6 characters')).toMatch(/Пароль/i)
    expect(localizeAuthError('Invalid login credentials')).toMatch(/пароль/i)
  })
})

describe('isProActive requires pro_until in the future', () => {
  const now = new Date('2026-08-17T12:00:00.000Z')

  it('false if is_pro true but pro_until missing or past', () => {
    expect(isProActive({ is_pro: true }, now)).toBe(false)
    expect(isProActive({ is_pro: true, pro_until: '2026-01-01T00:00:00.000Z' }, now)).toBe(false)
  })

  it('true only with is_pro and future pro_until', () => {
    expect(isProActive({ is_pro: true, pro_until: '2026-09-01T00:00:00.000Z' }, now)).toBe(true)
    expect(isProActive({ is_pro: false, pro_until: '2026-09-01T00:00:00.000Z' }, now)).toBe(false)
  })

  it('trial helpers still compute 7 days', () => {
    const start = getTrialStartAt({ created_at: '2026-08-10T12:00:00.000Z' }, now)
    expect(getTrialEndsAt(start).toISOString()).toBe('2026-08-17T12:00:00.000Z')
  })
})

describe('product chat draft', () => {
  it('builds interest text without /products path', () => {
    const text = buildProductInterestMessage({ name: 'SENIX X2', price: 10000 })
    expect(text).toContain('SENIX X2')
    expect(text).toContain('10')
    expect(text).not.toMatch(/\/products\//)
  })

  it('strips product uuid paths from old messages', () => {
    const raw =
      'Здравствуйте! Интересует товар «Makita» за 95 000 ₽\n/products/82885045-59d2-4276-844d-d59f81022585'
    expect(stripProductPathFromContent(raw)).toBe(
      'Здравствуйте! Интересует товар «Makita» за 95 000 ₽'
    )
  })

  it('detects old auto-messages by product path', () => {
    expect(
      hasProductContextMessage(
        [{ content: 'hi\n/products/82885045-59d2-4276-844d-d59f81022585' }],
        '82885045-59d2-4276-844d-d59f81022585'
      )
    ).toBe(true)
    expect(hasProductContextMessage([{ content: 'привет' }], '82885045-59d2-4276-844d-d59f81022585')).toBe(
      false
    )
  })
})

describe('product recommendations by master task', () => {
  it('maps roofing subcategory to lumber, roofing and fasteners — not masonry', () => {
    const mapped = getProductCategoriesForMasterSubcategorySlugs(['krovelnye-raboty'], ['stroika'])
    expect(mapped.categorySlugs).toEqual(
      expect.arrayContaining(['lumber-panels', 'roofing-gutters', 'fasteners-hardware', 'insulation', 'waterproofing-sealants'])
    )
    expect(mapped.categorySlugs[0]).toBe('roofing-gutters')
    expect(mapped.categorySlugs).not.toContain('masonry-blocks-jbi')
    expect(mapped.subcategorySlugs).toEqual(
      expect.arrayContaining([
        'lumber-timber',
        'roofing-gutters-metal-tiles',
        'roofing-gutters-slate',
        'fasteners-screws',
        'fasteners-nails',
        'insulation-roof',
      ])
    )
  })

  it('interleaves roofing kit so lumber does not occupy the first cards', () => {
    expect(normalizeCity('г. Урус-Мартан')).toBe(normalizeCity('урус-мартан'))
    const mixed = interleaveByCategoryOrder(
      [
        { name: 'брус', category_ref: { slug: 'lumber-panels' } },
        { name: 'доски', category_ref: { slug: 'lumber-panels' } },
        { name: 'азбист', category_ref: { slug: 'roofing-gutters' } },
        { name: 'гвозди', category_ref: { slug: 'fasteners-hardware' } },
      ],
      ['roofing-gutters', 'fasteners-hardware', 'lumber-panels'],
      4
    )
    expect(mixed.map((item) => item.name)).toEqual(['азбист', 'гвозди', 'брус', 'доски'])
  })

  it('does not give lumber to physical security guards', () => {
    const mapped = getProductCategoriesForMasterSubcategorySlugs(['ohrannye-uslugi'], ['ohrana-bezopasnost'])
    expect(mapped.categorySlugs).not.toContain('lumber-panels')
    expect(mapped.categorySlugs).toHaveLength(0)
  })

  it('maps electrician to cables, outlets and fixtures — not tiles', () => {
    const mapped = getProductCategoriesForMasterSubcategorySlugs(['elektromontazh'], ['otdelka-remont'])
    expect(mapped.categorySlugs).toEqual(
      expect.arrayContaining(['electrical-lighting', 'low-voltage-smart-home', 'power-tools'])
    )
    expect(mapped.categorySlugs).not.toContain('tile-stone')
    expect(mapped.categorySlugs).not.toContain('flooring')
    expect(mapped.subcategorySlugs).toEqual(
      expect.arrayContaining(['electrical-cable', 'electrical-outlets', 'electrical-panels-breakers'])
    )
  })

  it('maps plasterer, tiler, auto-electrician and welder without leaking roofing lumber', () => {
    const plaster = getProductCategoriesForMasterSubcategorySlugs(['shtukaturka'], ['otdelka-remont'])
    expect(plaster.categorySlugs).toContain('building-mixes')
    expect(plaster.categorySlugs).not.toContain('electrical-lighting')

    const tile = getProductCategoriesForMasterSubcategorySlugs(['plitka-kamen'], ['otdelka-remont'])
    expect(tile.categorySlugs).toContain('tile-stone')
    expect(tile.categorySlugs).not.toContain('electrical-lighting')

    const autoEl = getProductCategoriesForMasterSubcategorySlugs(['avtoelektrik'], ['autoservice'])
    expect(autoEl.categorySlugs).toContain('auto-electronics')
    expect(autoEl.categorySlugs).not.toContain('auto-parts-engine-gearbox')

    const weld = getProductCategoriesForMasterSubcategorySlugs(['svarka'], ['specoborudovanie'])
    expect(weld.categorySlugs).toContain('metalworks-welding-materials')
    expect(weld.categorySlugs).not.toContain('building-mixes')

    const fund = getProductCategoriesForMasterSubcategorySlugs(['fundament'], ['stroika'])
    expect(fund.categorySlugs).toEqual(expect.arrayContaining(['building-mixes', 'bulk-materials']))
    expect(fund.categorySlugs).not.toContain('roofing-gutters')
  })

  it('maps heating, ceilings, clinker and paving to the right product slugs', () => {
    const heat = getProductCategoriesForMasterSubcategorySlugs(['otoplenie'], ['otdelka-remont'])
    expect(heat.categorySlugs).toContain('heating-boilers')
    expect(heat.categorySlugs).not.toContain('flooring')
    expect(heat.subcategorySlugs).toEqual(expect.arrayContaining(['heating-radiators', 'heating-pipes']))

    const ceilings = getProductCategoriesForMasterSubcategorySlugs(['potolki'], ['otdelka-remont'])
    expect(ceilings.subcategorySlugs).toEqual(expect.arrayContaining(['finishing-ceilings', 'finishing-drywall']))
    expect(ceilings.categorySlugs).not.toContain('auto-parts-engine-gearbox')

    const clinker = getProductCategoriesForMasterSubcategorySlugs(['klinker'], ['stroika'])
    expect(clinker.subcategorySlugs).toContain('facades-cladding-clinker')
    expect(clinker.categorySlugs).not.toContain('roofing-gutters')

    const paving = getProductCategoriesForMasterSubcategorySlugs(['moshchenie-bruschatka'], ['blagoustrojstvo'])
    expect(paving.subcategorySlugs).toEqual(expect.arrayContaining(['landscape-pavers', 'landscape-bruschatka']))
    expect(paving.subcategorySlugs).not.toContain('landscaping-pavers')
  })

  it('does not give home split-systems to a car AC mechanic', () => {
    const mapped = getProductCategoriesForMasterSubcategorySlugs(['kondicioner-klimat'], ['autoservice'])
    expect(mapped.categorySlugs).not.toContain('ventilation-ac')
    expect(mapped.subcategorySlugs).toEqual(expect.arrayContaining(['auto-cooling', 'auto-coolants']))
  })

  it('covers every live master subcategory slug so parent fallback cannot leak', () => {
    const liveSlugs = [
      'agrarnaya-tehnika', 'almaznoe-burenie', 'arhitektura', 'avtoelektrik', 'betononasosy',
      'burovaya-tehnika', 'bytovaya-tehnika', 'chistka-obsluzhivanie-septikov', 'cifrovaya-tehnika',
      'demontazh-razborka', 'detejling', 'dezinfekciya-obrabotka', 'dlinomer', 'drenazh-livnevka',
      'dvigatel', 'ekskavatory', 'elektromontazh', 'evakuator', 'fundament', 'gruzy-obshchie',
      'himchistka', 'hodovaya-chast', 'kladka', 'kladka-bloka', 'kladka-kirpicha', 'klinker',
      'kolodcy', 'kondicioner-klimat', 'kontrol-dostupa', 'kovka-metall', 'krany', 'krovelnye-raboty',
      'kurereskaya-dostavka', 'kuzovnoj-remont', 'kvartirnyj-pereezd', 'laminat', 'lestnitsy-beton',
      'manipulyatory', 'melkie-santehnicheskie-raboty', 'melkij-elektromontazh', 'melkij-remont-dom',
      'montazh-na-vysote', 'montazh-ustanovka', 'moshchenie-bruschatka', 'moyka-chistka-vysota',
      'moyka-okon-pomeshcheniya', 'oboi-pokraska', 'oformlenie-sdelki', 'ohrana-videonablyudenie',
      'ohrannye-uslugi', 'okna-dveri', 'orgtehnika', 'otkachka-ilosos', 'otkosy-podokonniki',
      'otoplenie', 'passazhirskie', 'perevozka-avto', 'perevozka-stroymaterialov', 'plitka-kamen',
      'podbor-avto', 'podsobnye-na-stroyke', 'pogruzchiki', 'pogruzochnye', 'poliv-avtopoliv',
      'potolki', 'pozharnaya-bezopasnost', 'privoz-vody', 'prochistka-trub', 'proverka-avto',
      'remont-kpp', 'remont-restavraciya', 'remont-sneg-vysota', 'samosvaly', 'santehnika',
      'sborna-mebeli-tehniki', 'shinomontazh', 'shtukaturka', 'skvazhiny-nasosy', 'styazhka-pola',
      'svarka', 'svarnye-izdeliya', 'tokarnye-raboty', 'tormoznaya-sistema', 'uborka-pomeshchenij',
      'uborka-posle-meropriyatij', 'uchastok-ozelenenie', 'udalenie-vmyatin-pdr', 'vodopodgotovka-filtry',
      'vspomogatelnye-raboty', 'vysotnye-raboty', 'vyvoz-othodov', 'zemlyanye-raboty-vruchnuyu',
    ]
    const missing = liveSlugs.filter((slug) => !SUBCATEGORY_SLUG_TO_PRODUCT_CATEGORIES[slug])
    expect(missing).toEqual([])
    expect(liveSlugs).toHaveLength(92)
  })
})

describe('clampRadiusKm', () => {
  it('keeps values in 1–200 km', async () => {
    const { clampRadiusKm } = await import('@/lib/map-radius')
    expect(clampRadiusKm(25)).toBe(25)
    expect(clampRadiusKm(0)).toBe(1)
    expect(clampRadiusKm(999)).toBe(200)
    expect(clampRadiusKm(Number.NaN)).toBe(1)
  })
})
