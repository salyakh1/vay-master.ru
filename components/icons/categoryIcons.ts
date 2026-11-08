import {
  AppWindow,
  Axe,
  BookOpen,
  Bolt,
  BrickWall,
  Camera,
  Car,
  DoorOpen,
  Droplets,
  FileText,
  Flame,
  Grid2x2,
  Hammer,
  Home,
  Layers,
  Monitor,
  PaintBucket,
  PaintRoller,
  Paintbrush,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Shovel,
  Snowflake,
  Sofa,
  Sparkles,
  Sprout,
  Square,
  TreePine,
  Truck,
  Tv,
  Wrench,
  Zap,
  type LucideIcon,
} from './index'

type Rule = [RegExp, LucideIcon]

/** Правила собираются лениво: index.ts и этот файл импортируют друг друга. */
let masterRules: Rule[] | null = null
let productRules: Rule[] | null = null

function getMasterRules(): Rule[] {
  masterRules ??= [
    [/спецтех|спецоборуд|экскав|манипул|кран/i, Truck],
    [/авто|машин|шин/i, Car],
    [/электр|провод|освещ|розет|свет/i, Zap],
    [/сантех|вод|канал|смесит|труб/i, Droplets],
    [/строй|строит|фундам|бетон|кладк|монолит/i, BrickWall],
    [/натяжн|потол/i, Square],
    [/плитк|керам/i, Grid2x2],
    [/отдел|штукат|обои|шпакл|покрас/i, PaintRoller],
    [/окн|остекл|балкон/i, AppWindow],
    [/двер/i, DoorOpen],
    [/кров|крыш|череп/i, Home],
    [/ландшафт|благоустр|сад|газон|озелен/i, TreePine],
    [/мебел|сборк|кухн/i, Sofa],
    [/убор|клининг|чист/i, Sparkles],
    [/кондиц|вентил|отопл|климат/i, Snowflake],
    [/свар|металл|кован/i, Flame],
    [/плот|столяр|дерев/i, Axe],
    [/демонт|снос/i, Shovel],
    [/ремонт/i, Hammer],
    [/быт|техник|стирал|холод/i, Tv],
    [/компью|it|софт|програм/i, Monitor],
    [/перевоз|груз|такси/i, Truck],
    [/юрид|бухгал|документ/i, FileText],
    [/фото|видео|съём/i, Camera],
    [/красот|маник|парик|стриж/i, Scissors],
    [/обуч|репет|курс/i, BookOpen],
    [/охран|безопас|сигнал/i, ShieldCheck],
    [/изоляц|утепл/i, Layers],
  ]
  return masterRules
}

function getProductRules(): Rule[] {
  productRules ??= [
    [/инструмент|tool/i, Wrench],
    [/материал|строймат|сух|смес/i, BrickWall],
    [/креп|метиз|саморез|болт/i, Bolt],
    [/электр|кабел|розет/i, Zap],
    [/сантех|труб|смесит/i, Droplets],
    [/краск|лак|эмаль/i, PaintBucket],
    [/обои|отдел/i, Paintbrush],
    [/защит|перчат|очк/i, ShieldCheck],
    [/сад|огород/i, Sprout],
    [/авто|масл/i, Car],
  ]
  return productRules
}

function matchRules(text: string, rules: Rule[]): LucideIcon | null {
  for (const [re, Icon] of rules) {
    if (re.test(text)) return Icon
  }
  return null
}

export function getMasterCategoryIcon(slug?: string | null, name?: string | null): LucideIcon {
  const text = `${slug ?? ''} ${name ?? ''}`.trim()
  if (!text) return Wrench
  return matchRules(text, getMasterRules()) ?? Wrench
}

export function getProductCategoryIcon(slug?: string | null, name?: string | null): LucideIcon {
  const text = `${slug ?? ''} ${name ?? ''}`.trim()
  if (!text) return ShoppingBag
  return matchRules(text, getProductRules()) ?? matchRules(text, getMasterRules()) ?? ShoppingBag
}
