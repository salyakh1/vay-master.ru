/**
 * Матч: подкатегория мастера → товары.
 * Источник: живые taxonomy (categories/subcategories + product_categories/product_subcategories).
 * Пустой kit = скроллер скрыт, без fallback на «всю стройку».
 */

export interface SpecializationProductMapping {
  specializationSlug: string
  categorySlugs: string[]
  subcategorySlugs?: string[]
}

export type ProductKit = {
  categories: string[]
  subcategories?: string[]
}

const kit = (categories: string[], subcategories: string[] = []): ProductKit => ({
  categories,
  subcategories,
})

const POWER_TOOL_SUBS = [
  'power-tools-drills-drivers',
  'power-tools-grinders',
  'power-tools-hammers',
  'power-tools-saws',
  'power-tools-sanders',
  'power-tools-impact',
  'power-tools-jigsaws',
  'power-tools-multitools',
  'power-tools-electrical-measuring',
]

const withPowerTools = (base: ProductKit): ProductKit => ({
  categories: base.categories.includes('power-tools') ? base.categories : [...base.categories, 'power-tools'],
  subcategories: Array.from(new Set([...(base.subcategories || []), ...POWER_TOOL_SUBS])),
})

/** Набор расходников + электроинструмент (дрели, болгарки, перфораторы). */
const TOOLS = (categories: string[], subcategories: string[] = []) => withPowerTools(kit(categories, subcategories))

const NONE: ProductKit = { categories: [] }

/** Кровля: покрытие и крепёж раньше обрешётки */
const ROOFING = TOOLS(
  ['roofing-gutters', 'fasteners-hardware', 'waterproofing-sealants', 'insulation', 'lumber-panels'],
  [
    'roofing-gutters-slate',
    'roofing-gutters-metal-tiles',
    'roofing-gutters-proflist',
    'roofing-gutters-shingles',
    'roofing-gutters-membranes',
    'roofing-gutters-snow-guards',
    'roofing-gutters-eaves',
    'roofing-gutters-pipes',
    'roofing-gutters-funnels-gutters',
    'roofing-gutters-passages-aerators',
    'fasteners-screws',
    'fasteners-wood-screws',
    'fasteners-nails',
    'fasteners-anchors',
    'fasteners-rivets',
    'fasteners-tapes',
    'fasteners-perforated',
    'waterproofing-roll',
    'waterproofing-bitumen',
    'waterproofing-primers',
    'waterproofing-tapes',
    'waterproofing-pvc',
    'sealants-polyurethane',
    'sealants-foam',
    'insulation-roof',
    'insulation-mineral-wool',
    'insulation-foil',
    'insulation-pir-pur',
    'hand-tools-roofing',
    'lumber-timber',
    'lumber-boards',
    'lumber-osb',
    'lumber-plywood',
  ]
)

const SOFT_ROOFING = TOOLS(
  ['roofing-gutters', 'fasteners-hardware', 'waterproofing-sealants', 'insulation', 'lumber-panels'],
  [
    'roofing-gutters-shingles',
    'roofing-gutters-membranes',
    'fasteners-screws',
    'fasteners-nails',
    'waterproofing-roll',
    'waterproofing-bitumen',
    'insulation-roof',
    'lumber-osb',
    'lumber-boards',
  ]
)

const GUTTERS = TOOLS(
  ['roofing-gutters', 'fasteners-hardware', 'waterproofing-sealants'],
  [
    'roofing-gutters-pipes',
    'roofing-gutters-funnels-gutters',
    'roofing-gutters-eaves',
    'fasteners-screws',
    'fasteners-rivets',
    'sealants-polyurethane',
  ]
)

const PLUMBING = TOOLS(
  ['plumbing-water-supply', 'sewer-septic', 'heating-boilers', 'waterproofing-sealants'],
  [
    'plumbing-pipes',
    'plumbing-fittings',
    'plumbing-faucets',
    'plumbing-traps',
    'plumbing-toilets',
    'plumbing-toilets-standalone',
    'plumbing-baths-showers',
    'plumbing-washbasins',
    'plumbing-pumps',
    'plumbing-filters',
    'plumbing-water-heaters',
    'plumbing-valves',
    'sewer-pipes',
    'sewer-fittings',
    'sewer-check-valves',
    'sewer-grease-traps',
    'fasteners-clamps',
    'fasteners-screws',
    'sealants-silicone',
    'sealants-foam',
    'insulation-pipes',
  ]
)

const ELECTRICAL = TOOLS(
  ['electrical-lighting', 'low-voltage-smart-home'],
  [
    'electrical-cable',
    'electrical-outlets',
    'electrical-switches',
    'electrical-panels-breakers',
    'electrical-rcd',
    'electrical-conduits',
    'electrical-lamps',
    'electrical-lighting-fixtures',
    'electrical-sensors',
    'electrical-meters',
    'electrical-accessories',
    'electrical-extensions',
    'smart-home-structured-cabling',
    'smart-home-sensors',
    'smart-home-outlets',
    'smart-home-lighting',
    'hand-tools-electrical',
    'power-tools-electrical-measuring',
    'fasteners-tapes',
    'fasteners-clamps',
    'fasteners-dowels',
  ]
)

const MASONRY_BRICK = TOOLS(
  ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials'],
  [
    'masonry-ceramic-brick',
    'masonry-silicate-brick',
    'masonry-brick-general',
    'masonry-lintels',
    'building-mixes-masonry',
    'building-mixes-cement',
    'building-mixes-plaster',
    'bulk-sand',
    'bulk-gravel',
    'bulk-pgs',
    'hand-tools-trowels',
  ]
)

const MASONRY_BLOCK = TOOLS(
  ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials'],
  [
    'masonry-aerated-block',
    'masonry-foam-block',
    'masonry-ceramic-block',
    'masonry-slag-block',
    'masonry-peplo-block',
    'masonry-adobe-blocks',
    'masonry-lintels',
    'building-mixes-masonry',
    'building-mixes-cement',
    'bulk-sand',
    'bulk-pgs',
    'hand-tools-trowels',
  ]
)

const CLINKER = TOOLS(
  ['facades-cladding', 'tile-stone', 'masonry-blocks-jbi', 'building-mixes'],
  [
    'facades-cladding-clinker',
    'facades-cladding-stone',
    'facades-natural-stone',
    'facades-imitation-stone',
    'tile-ceramic',
    'tile-porcelain',
    'tile-adhesive',
    'building-mixes-masonry',
    'building-mixes-tile-adhesive',
    'masonry-ceramic-brick',
  ]
)

const PLASTER = TOOLS(
  ['building-mixes', 'finishing-materials'],
  [
    'building-mixes-plaster',
    'building-mixes-putty',
    'building-mixes-primers',
    'finishing-decor-plaster',
    'finishing-drywall',
    'finishing-adhesives-primers',
    'hand-tools-trowels',
    'power-tools-sanders',
  ]
)

const SCREED = TOOLS(
  ['building-mixes', 'bulk-materials', 'waterproofing-sealants', 'heating-boilers'],
  [
    'building-mixes-screed',
    'building-mixes-self-leveling',
    'building-mixes-cement',
    'building-mixes-sand-concrete',
    'building-mixes-primers',
    'bulk-sand',
    'bulk-expanded-clay',
    'bulk-gravel',
    'waterproofing-coating',
    'waterproofing-roll',
    'heating-floor',
    'power-tools-concrete-mixers',
  ]
)

const DRYWALL = TOOLS(
  ['finishing-materials', 'fasteners-hardware', 'insulation', 'lumber-panels'],
  [
    'finishing-drywall',
    'finishing-drywall-sheet',
    'finishing-gypsum-products',
    'finishing-profiles',
    'finishing-ceilings',
    'fasteners-screws',
    'fasteners-dowels',
    'building-mixes-putty',
    'building-mixes-primers',
    'insulation-sound',
    'lumber-osb',
    'lumber-plywood',
  ]
)

const CEILINGS = TOOLS(
  ['finishing-materials', 'fasteners-hardware', 'insulation'],
  [
    'finishing-ceilings',
    'finishing-drywall',
    'finishing-drywall-sheet',
    'finishing-profiles',
    'fasteners-screws',
    'insulation-sound',
    'electrical-lighting-fixtures',
    'electrical-lamps',
  ]
)

const PAINTING = TOOLS(
  ['finishing-materials', 'building-mixes'],
  [
    'finishing-paints',
    'finishing-wallpaper',
    'finishing-adhesives-primers',
    'finishing-decor-plaster',
    'building-mixes-primers',
    'building-mixes-putty',
    'finishing-sealants-foam',
    'power-tools-sanders',
  ]
)

const TILE = TOOLS(
  ['tile-stone', 'building-mixes', 'waterproofing-sealants'],
  [
    'tile-ceramic',
    'tile-porcelain',
    'tile-mosaic',
    'tile-natural-stone',
    'tile-decor',
    'tile-adhesive',
    'tile-grout',
    'tile-profiles',
    'tile-leveling',
    'tile-tools',
    'building-mixes-tile-adhesive',
    'building-mixes-grout',
    'waterproofing-coating',
    'waterproofing-roll',
    'heating-floor',
  ]
)

const FLOORING = TOOLS(
  ['flooring', 'building-mixes'],
  [
    'flooring-laminate',
    'flooring-parquet',
    'flooring-vinyl',
    'flooring-linoleum',
    'flooring-solid-wood',
    'flooring-underlay',
    'flooring-baseboards',
    'flooring-thresholds',
    'flooring-finishes',
    'flooring-accessories',
    'flooring-floor-heat',
    'building-mixes-primers',
    'building-mixes-self-leveling',
  ]
)

const WINDOWS_DOORS = TOOLS(
  ['windows-doors-hardware', 'waterproofing-sealants', 'insulation'],
  [
    'windows-pvc',
    'windows-aluminum',
    'doors-entry',
    'doors-interior',
    'doors-hardware',
    'windows-hardware',
    'doors-locks-handles',
    'windows-sills',
    'windows-slopes',
    'windows-seals',
    'sealants-foam',
    'sealants-silicone',
    'insulation-mineral-wool',
    'insulation-polystyrene',
  ]
)

const SLOPES_SILLS = TOOLS(
  ['windows-doors-hardware', 'finishing-materials', 'building-mixes', 'insulation'],
  [
    'windows-sills',
    'windows-slopes',
    'finishing-drywall',
    'building-mixes-plaster',
    'building-mixes-putty',
    'sealants-foam',
    'insulation-mineral-wool',
    'insulation-polystyrene',
  ]
)

const HEATING = TOOLS(
  ['heating-boilers', 'plumbing-water-supply', 'insulation', 'fasteners-hardware'],
  [
    'heating-boilers-devices',
    'heating-radiators',
    'heating-floor',
    'heating-manifolds',
    'heating-pumps',
    'heating-pipes',
    'heating-fittings',
    'heating-chimneys',
    'heating-valves',
    'heating-automation',
    'plumbing-pipes',
    'plumbing-fittings',
    'plumbing-valves',
    'insulation-pipes',
    'insulation-foil',
    'fasteners-clamps',
  ]
)

const HVAC = TOOLS(
  ['ventilation-ac', 'fasteners-hardware', 'electrical-lighting'],
  [
    'ventilation-splits',
    'ventilation-multisplit',
    'ventilation-home-ac',
    'ventilation-mobile-ac',
    'ventilation-ducts',
    'ventilation-fans',
    'ventilation-filters',
    'ventilation-grilles',
    'ventilation-mounts-lines',
    'ventilation-recuperators',
    'electrical-cable',
    'fasteners-anchors',
    'fasteners-clamps',
  ]
)

const FACADE = TOOLS(
  ['facades-cladding', 'insulation', 'waterproofing-sealants', 'fasteners-hardware', 'building-mixes'],
  [
    'facades-cladding-siding',
    'facades-cladding-panels',
    'facades-cladding-decor-plaster',
    'facades-cladding-clinker',
    'facades-cladding-stone',
    'facades-cladding-composite',
    'facades-cladding-vent',
    'facades-cladding-insulated',
    'facades-cladding-subsystems',
    'facades-cladding-paints',
    'insulation-mineral-wool',
    'insulation-polystyrene',
    'waterproofing-roll',
    'waterproofing-coating',
    'fasteners-screws',
    'fasteners-anchors',
  ]
)

const FENCES = TOOLS(
  ['fences-gates', 'metalworks-welding-materials', 'fasteners-hardware', 'building-mixes'],
  [
    'fences-proflist',
    'fences-pickets',
    'fences-chain-link',
    'fences-posts-rails',
    'fences-hardware',
    'fences-concrete',
    'gates-swing',
    'gates-sliding',
    'gates-automation',
    'wickets',
    'metalworks-profile-pipes',
    'metalworks-sheet',
    'fasteners-screws',
    'fasteners-bolts',
    'building-mixes-cement',
  ]
)

const WELDING = TOOLS(
  ['metalworks-welding-materials', 'consumables-accessories', 'fasteners-hardware'],
  [
    'metalworks-profile-pipes',
    'metalworks-rebar',
    'metalworks-sheet',
    'metalworks-angles-channels',
    'metalworks-electrodes',
    'metalworks-wire',
    'metalworks-welding-hardware',
    'metalworks-rolling',
    'metalworks-welded-mesh',
    'metalworks-iron-pipes',
    'power-tools-welding',
    'power-tools-grinders',
    'consumables-cutting-discs',
    'fasteners-bolts',
    'fasteners-clamps',
  ]
)

const FORGING = TOOLS(
  ['metalworks-welding-materials', 'fences-gates', 'fasteners-hardware'],
  [
    'metalworks-forged',
    'metalworks-profile-pipes',
    'metalworks-sheet',
    'metalworks-electrodes',
    'metalworks-wire',
    'fences-pickets',
    'gates-swing',
    'wickets',
    'power-tools-welding',
  ]
)

const LANDSCAPE = kit(
  ['landscaping-outdoor', 'bulk-materials', 'fences-gates'],
  [
    'landscape-lawn',
    'landscape-mulch',
    'landscape-geotextile',
    'landscape-drainage',
    'landscape-irrigation',
    'landscape-lighting',
    'landscape-gabions',
    'landscape-paths',
    'bulk-soil',
    'bulk-sand',
    'bulk-gravel',
  ]
)

const PAVING = kit(
  ['landscaping-outdoor', 'bulk-materials', 'building-mixes', 'masonry-blocks-jbi'],
  [
    'landscape-pavers',
    'landscape-bruschatka',
    'landscape-curbs',
    'landscape-paths',
    'landscape-geotextile',
    'masonry-curbs',
    'bulk-sand',
    'bulk-gravel',
    'bulk-screenings',
    'building-mixes-cement',
    'building-mixes-sand-concrete',
  ]
)

const DRAINAGE = kit(
  ['landscaping-outdoor', 'sewer-septic', 'bulk-materials'],
  [
    'landscape-drainage',
    'landscape-geotextile',
    'sewer-drainage',
    'sewer-pipes',
    'sewer-fittings',
    'sewer-wells',
    'bulk-gravel',
    'bulk-sand',
  ]
)

const IRRIGATION = kit(
  ['landscaping-outdoor', 'plumbing-water-supply'],
  [
    'landscape-irrigation',
    'plumbing-pipes',
    'plumbing-fittings',
    'plumbing-pumps',
    'plumbing-valves',
    'fasteners-clamps',
  ]
)

const SEPTIC = kit(
  ['sewer-septic', 'plumbing-water-supply', 'bulk-materials'],
  [
    'sewer-septics',
    'sewer-treatment',
    'sewer-pipes',
    'sewer-fittings',
    'sewer-wells',
    'sewer-manhole-covers',
    'sewer-aerators',
    'sewer-concrete-rings',
    'plumbing-pipes',
    'bulk-sand',
    'bulk-gravel',
  ]
)

const WELLS = kit(
  ['plumbing-water-supply', 'sewer-septic', 'masonry-blocks-jbi', 'electrical-lighting'],
  [
    'plumbing-pumps',
    'plumbing-pipes',
    'plumbing-fittings',
    'plumbing-filters',
    'masonry-rings',
    'sewer-concrete-rings',
    'sewer-manhole-covers',
    'electrical-cable',
  ]
)

const WATER_FILTERS = kit(
  ['plumbing-water-supply'],
  ['plumbing-filters', 'plumbing-pumps', 'plumbing-pipes', 'plumbing-fittings']
)

const FOUNDATION = TOOLS(
  ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'metalworks-welding-materials', 'waterproofing-sealants'],
  [
    'masonry-fbs',
    'masonry-slabs',
    'building-mixes-cement',
    'building-mixes-sand-concrete',
    'bulk-sand',
    'bulk-gravel',
    'bulk-pgs',
    'metalworks-rebar',
    'metalworks-welded-mesh',
    'waterproofing-coating',
    'waterproofing-roll',
    'waterproofing-penetrating',
    'power-tools-concrete-mixers',
  ]
)

const CONCRETE_STAIRS = TOOLS(
  ['masonry-blocks-jbi', 'building-mixes', 'metalworks-welding-materials', 'tile-stone'],
  [
    'masonry-fbs',
    'building-mixes-cement',
    'building-mixes-sand-concrete',
    'metalworks-rebar',
    'tile-ceramic',
    'tile-porcelain',
    'tile-adhesive',
    'metalworks-profile-pipes',
  ]
)

const GENERAL_BUILD = TOOLS(
  ['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'lumber-panels', 'fasteners-hardware']
)

const DEMOLITION = TOOLS(
  ['consumables-accessories', 'building-mixes', 'fasteners-hardware'],
  [
    'power-tools-hammers',
    'power-tools-grinders',
    'consumables-drill-bits',
    'consumables-hammer-bits',
    'consumables-cutting-discs',
    'consumables-hole-saws',
    'fasteners-anchors',
    'building-mixes-cement',
    'building-mixes-putty',
  ]
)

const DIAMOND = TOOLS(
  ['consumables-accessories', 'building-mixes', 'fasteners-hardware'],
  [
    'power-tools-hammers',
    'power-tools-drills-drivers',
    'consumables-hole-saws',
    'consumables-hammer-bits',
    'consumables-drill-bits',
    'consumables-cutting-discs',
    'fasteners-anchors',
    'fasteners-dowels',
    'building-mixes-cement',
  ]
)

const TURNING = TOOLS(
  ['metalworks-welding-materials', 'consumables-accessories'],
  [
    'metalworks-rolling',
    'metalworks-profile-pipes',
    'metalworks-sheet',
    'metalworks-angles-channels',
    'consumables-cutting-discs',
    'consumables-drill-bits',
    'power-tools-grinders',
    'power-tools-drills-drivers',
  ]
)

const ENGINE = kit(
  ['auto-parts-engine-gearbox', 'auto-chemicals-detailing'],
  [
    'auto-engine-parts',
    'auto-timing',
    'auto-turbos',
    'auto-fuel-system',
    'auto-cooling',
    'auto-exhaust',
    'auto-engine-mounts',
    'auto-oils-engine',
    'auto-coolants',
  ]
)

const GEARBOX = kit(
  ['auto-parts-engine-gearbox', 'auto-chemicals-detailing'],
  [
    'auto-manual-gearbox',
    'auto-auto-gearbox',
    'auto-clutch',
    'auto-cv-joints',
    'auto-oils-gearbox',
  ]
)

const SUSPENSION = kit(
  ['auto-parts-suspension-brakes'],
  [
    'auto-shocks',
    'auto-arms',
    'auto-stabilizers',
    'auto-steering',
    'auto-bearings',
    'auto-cv-joints',
  ]
)

const BRAKES = kit(
  ['auto-parts-suspension-brakes', 'auto-chemicals-detailing'],
  ['auto-brake-pads', 'auto-brake-discs', 'auto-calipers', 'auto-brake-fluids']
)

const TIRES = kit(
  ['auto-parts-suspension-brakes'],
  ['auto-wheels-tires', 'auto-bearings']
)

const AUTO_ELECTRIC = kit(
  ['auto-electronics'],
  [
    'auto-batteries',
    'auto-alternators',
    'auto-starters',
    'auto-wiring',
    'auto-fuses',
    'auto-sensors',
    'auto-ecu',
    'auto-lighting',
    'auto-alarms',
    'auto-multimedia',
  ]
)

const DETAILING = kit(
  ['auto-chemicals-detailing'],
  [
    'auto-cleaners',
    'auto-polishes',
    'auto-protective-coatings',
    'auto-interior-clean',
    'auto-washer-fluid',
    'auto-fragrances',
  ]
)

const BODY = kit(
  ['auto-chemicals-detailing', 'metalworks-welding-materials', 'fasteners-hardware'],
  [
    'auto-polishes',
    'auto-protective-coatings',
    'metalworks-sheet',
    'metalworks-electrodes',
    'fasteners-rivets',
    'consumables-abrasives',
    'power-tools-sanders',
  ]
)

const PDR = kit(
  ['auto-chemicals-detailing', 'consumables-accessories'],
  ['auto-polishes', 'consumables-abrasives', 'hand-tools-sets']
)

const AUTO_AC = kit(
  ['auto-parts-engine-gearbox', 'auto-chemicals-detailing', 'auto-electronics'],
  ['auto-cooling', 'auto-coolants', 'auto-sensors']
)

const CCTV = kit(
  ['low-voltage-smart-home', 'electrical-lighting'],
  [
    'smart-home-cameras',
    'smart-home-alarm',
    'smart-home-intercoms',
    'smart-home-sensors',
    'smart-home-structured-cabling',
    'electrical-cable',
    'electrical-conduits',
  ]
)

const ACCESS = kit(
  ['low-voltage-smart-home', 'electrical-lighting'],
  [
    'smart-home-controllers',
    'smart-home-intercoms',
    'smart-home-alarm',
    'smart-home-sensors',
    'electrical-cable',
  ]
)

const FIRE = kit(
  ['low-voltage-smart-home', 'electrical-lighting'],
  ['smart-home-sensors', 'smart-home-alarm', 'electrical-cable', 'electrical-sensors']
)

const FURNITURE = TOOLS(
  ['furniture-kitchen-hardware', 'fasteners-hardware'],
  [
    'furniture-hinges',
    'furniture-slides',
    'furniture-handles',
    'furniture-fasteners',
    'furniture-lifts',
    'furniture-legs',
    'furniture-kitchen',
    'fasteners-screws',
    'hand-tools-screwdrivers',
  ]
)

const HANDYMAN = TOOLS(
  ['fasteners-hardware', 'building-mixes', 'finishing-materials'],
  [
    'fasteners-screws',
    'fasteners-dowels',
    'fasteners-anchors',
    'building-mixes-putty',
    'building-mixes-primers',
    'finishing-sealants-foam',
    'hand-tools-sets',
  ]
)

const TOOLS_ONLY = kit(
  ['consumables-accessories'],
  [
    'power-tools-drills-drivers',
    'power-tools-grinders',
    'hand-tools-sets',
    'consumables-cutting-discs',
    'consumables-drill-bits',
  ]
)

const CONCRETE_PUMP = kit(
  ['building-mixes', 'bulk-materials'],
  [
    'building-mixes-cement',
    'building-mixes-sand-concrete',
    'bulk-sand',
    'bulk-gravel',
    'bulk-pgs',
    'power-tools-concrete-mixers',
  ]
)

const EARTHWORK = kit(
  ['bulk-materials'],
  ['bulk-sand', 'bulk-gravel', 'bulk-pgs', 'bulk-soil', 'bulk-screenings']
)

const HEIGHT_MOUNT = TOOLS(
  ['fasteners-hardware', 'facades-cladding', 'roofing-gutters'],
  ['fasteners-anchors', 'fasteners-bolts', 'facades-cladding-subsystems', 'roofing-gutters-snow-guards']
)

const HEIGHT_SNOW = kit(
  ['roofing-gutters'],
  ['roofing-gutters-snow-guards', 'hand-tools-roofing']
)

/** Старые английские ключи + алиасы фильтров */
export const SPECIALIZATION_TO_PRODUCT_CATEGORIES: Record<string, ProductKit> = {
  'roofing-gutter': ROOFING,
  plumbing: PLUMBING,
  electrical: ELECTRICAL,
  masonry: MASONRY_BRICK,
  plaster: PLASTER,
  'floor-screed': SCREED,
  drywall: DRYWALL,
  'painting-walls': PAINTING,
  'tile-stone': TILE,
  flooring: FLOORING,
  facade: FACADE,
  'fences-gates': FENCES,
  'metal-welding': WELDING,
  heating: HEATING,
  hvac: HVAC,
  'windows-doors': WINDOWS_DOORS,
  landscaping: LANDSCAPE,
  'septic-drain': SEPTIC,
  'water-supply': WELLS,
  'general-construction': GENERAL_BUILD,
  'foundation-concrete': FOUNDATION,
  'autoservice-common': kit(['auto-parts-engine-gearbox', 'auto-parts-suspension-brakes', 'auto-electronics', 'auto-chemicals-detailing']),
  'engine-motor': ENGINE,
  'transmission-gearbox': GEARBOX,
  'suspension-steering': SUSPENSION,
  'brake-system': BRAKES,
  'auto-electric': AUTO_ELECTRIC,
  'body-repair': BODY,
  'body-welding': BODY,
  painting: PAINTING,
  'low-voltage-smart': ACCESS,
  'cctv-security': CCTV,
  'demolition-core': DEMOLITION,
  'diamond-drilling': DIAMOND,
}

export const CATEGORY_SLUG_TO_PRODUCT_CATEGORIES: Record<string, ProductKit> = {
  stroika: kit(['masonry-blocks-jbi', 'building-mixes', 'bulk-materials', 'lumber-panels', 'roofing-gutters', 'fasteners-hardware']),
  'otdelka-remont': kit(['building-mixes', 'finishing-materials', 'tile-stone', 'flooring', 'plumbing-water-supply', 'electrical-lighting', 'heating-boilers']),
  autoservice: kit(['auto-parts-engine-gearbox', 'auto-parts-suspension-brakes', 'auto-electronics', 'auto-chemicals-detailing']),
  gruzoperevozki: NONE,
  spectehnika: TOOLS_ONLY,
  blagoustrojstvo: kit(['landscaping-outdoor', 'bulk-materials', 'fences-gates']),
  'hudozhestvennaya-kovka': FORGING,
  'prom-alpinizm': kit(['fasteners-hardware', 'facades-cladding', 'roofing-gutters']),
  'otkachka-kanalizacii': SEPTIC,
  vodosnabzhenie: WELLS,
  klining: NONE,
  'master-na-chas': HANDYMAN,
  'ohrana-bezopasnost': kit(['low-voltage-smart-home', 'electrical-lighting']),
  'vyvoz-musora': NONE,
  gruzchiki: NONE,
  raznorabochye: GENERAL_BUILD,
  avtopodbor: NONE,
  avtoperevozki: NONE,
  'remont-tehniki': TOOLS_ONLY,
  'dizajn-proektirovanie': NONE,
  specoborudovanie: kit(['metalworks-welding-materials', 'consumables-accessories']),
}

/**
 * Все живые подкатегории мастеров + алиасы.
 * Явная запись обязательна.
 */
export const SUBCATEGORY_SLUG_TO_PRODUCT_CATEGORIES: Record<string, ProductKit> = {
  // --- Стройка ---
  fundament: FOUNDATION,
  'kladka-kirpicha': MASONRY_BRICK,
  'kladka-bloka': MASONRY_BLOCK,
  klinker: CLINKER,
  'krovelnye-raboty': ROOFING,
  'roofing-gutter': ROOFING,
  'montazh-demontazh-krovli': ROOFING,
  'myagkaya-krovlya': SOFT_ROOFING,
  'vodostochnaya-sistema': GUTTERS,
  'lestnitsy-beton': CONCRETE_STAIRS,

  // --- Отделка ---
  shtukaturka: PLASTER,
  plaster: PLASTER,
  'plitka-kamen': TILE,
  kladka: TILE,
  santehnika: PLUMBING,
  plumbing: PLUMBING,
  elektromontazh: ELECTRICAL,
  electrical: ELECTRICAL,
  'melkij-elektromontazh': ELECTRICAL,
  'okna-dveri': WINDOWS_DOORS,
  'otkosy-podokonniki': SLOPES_SILLS,
  'styazhka-pola': SCREED,
  laminat: FLOORING,
  'laminat-parket': FLOORING,
  peregorodki: DRYWALL,
  'oboi-pokraska': PAINTING,
  otoplenie: HEATING,
  potolki: CEILINGS,

  // --- Автосервис ---
  dvigatel: ENGINE,
  'engine-motor': ENGINE,
  'kuzovnoj-remont': BODY,
  shinomontazh: TIRES,
  avtoelektrik: AUTO_ELECTRIC,
  detejling: DETAILING,
  'remont-kpp': GEARBOX,
  'hodovaya-chast': SUSPENSION,
  'tormoznaya-sistema': BRAKES,
  'kondicioner-klimat': AUTO_AC,
  'udalenie-vmyatin-pdr': PDR,

  // --- Грузы / переезды ---
  dlinomer: NONE,
  'kurereskaya-dostavka': NONE,
  'perevozka-stroymaterialov': NONE,
  'kvartirnyj-pereezd': NONE,
  'gruzy-obshchie': NONE,

  // --- Спецтехника ---
  'agrarnaya-tehnika': TOOLS_ONLY,
  krany: TOOLS_ONLY,
  samosvaly: EARTHWORK,
  ekskavatory: EARTHWORK,
  pogruzchiki: TOOLS_ONLY,
  'burovaya-tehnika': DIAMOND,
  betononasosy: CONCRETE_PUMP,
  manipulyatory: TOOLS_ONLY,

  // --- Благоустройство ---
  'uchastok-ozelenenie': LANDSCAPE,
  'moshchenie-bruschatka': PAVING,
  'drenazh-livnevka': DRAINAGE,
  'poliv-avtopoliv': IRRIGATION,

  // --- Ковка / металл ---
  'kovka-metall': FORGING,
  'svarnye-izdeliya': WELDING,
  'montazh-ustanovka': FENCES,
  'remont-restavraciya': FORGING,
  svarka: WELDING,
  'tokarnye-raboty': TURNING,

  // --- Пром-альпинизм ---
  'vysotnye-raboty': HEIGHT_MOUNT,
  'moyka-chistka-vysota': NONE,
  'montazh-na-vysote': HEIGHT_MOUNT,
  'remont-sneg-vysota': HEIGHT_SNOW,

  // --- Септик ---
  'otkachka-ilosos': SEPTIC,
  'chistka-obsluzhivanie-septikov': SEPTIC,
  'prochistka-trub': SEPTIC,

  // --- Вода ---
  'skvazhiny-nasosy': WELLS,
  kolodcy: WELLS,
  'privoz-vody': NONE,
  'vodopodgotovka-filtry': WATER_FILTERS,

  // --- Клининг ---
  'uborka-pomeshchenij': NONE,
  himchistka: NONE,
  'moyka-okon-pomeshcheniya': NONE,
  'uborka-posle-meropriyatij': NONE,
  'dezinfekciya-obrabotka': NONE,

  // --- Мастер на час ---
  'sborna-mebeli-tehniki': FURNITURE,
  'melkij-remont-dom': HANDYMAN,
  'melkie-santehnicheskie-raboty': PLUMBING,

  // --- Охрана ---
  'ohrana-videonablyudenie': CCTV,
  'pozharnaya-bezopasnost': FIRE,
  'kontrol-dostupa': ACCESS,
  'ohrannye-uslugi': NONE,
  'fizicheskaya-ohrana': NONE,
  patrulirovanie: NONE,
  'ohrana-obektov': NONE,
  'ohrana-meropriyatij': NONE,
  'ohrana-territorii': NONE,

  // --- Вывоз / грузчики ---
  'vyvoz-othodov': NONE,
  pogruzochnye: NONE,

  // --- Разнорабочие ---
  'podsobnye-na-stroyke': GENERAL_BUILD,
  'zemlyanye-raboty-vruchnuyu': EARTHWORK,
  'demontazh-razborka': DEMOLITION,
  'vspomogatelnye-raboty': GENERAL_BUILD,

  // --- Автоподбор / автоперевозки ---
  'podbor-avto': NONE,
  'proverka-avto': NONE,
  'oformlenie-sdelki': NONE,
  evakuator: NONE,
  passazhirskie: NONE,
  'perevozka-avto': NONE,

  // --- Ремонт техники ---
  'bytovaya-tehnika': TOOLS_ONLY,
  'cifrovaya-tehnika': TOOLS_ONLY,
  orgtehnika: TOOLS_ONLY,

  // --- Дизайн ---
  arhitektura: NONE,

  // --- Спецоборудование ---
  'almaznoe-burenie': DIAMOND,
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

export function getProductCategoriesForMasterSubcategorySlugs(
  subcategorySlugs: string[],
  categorySlugsFallback: string[]
): { categorySlugs: string[]; subcategorySlugs: string[] } {
  const categorySlugsSet = new Set<string>()
  const subcategorySlugsSet = new Set<string>()
  let hasSubMapping = false
  for (const slug of subcategorySlugs) {
    const mapping = SUBCATEGORY_SLUG_TO_PRODUCT_CATEGORIES[slug]
    if (mapping) {
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
