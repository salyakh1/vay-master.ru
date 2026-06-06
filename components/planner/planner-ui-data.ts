export type MatOption = { id: string; icon: string; name: string; sub: string; keywords: string[] }

export const FLOOR_MATS: MatOption[] = [
  { id: 'tile', icon: '🟫', name: 'Плитка', sub: 'кв.м', keywords: ['плитк'] },
  { id: 'laminate', icon: '🟤', name: 'Ламинат', sub: 'кв.м', keywords: ['ламинат'] },
  { id: 'screed', icon: '⬜', name: 'Стяжка', sub: 'м³', keywords: ['стяжк', 'наливн'] },
  { id: 'parquet', icon: '🪵', name: 'Паркет', sub: 'кв.м', keywords: ['паркет'] },
  { id: 'carpet', icon: '🟥', name: 'Ковролин', sub: 'кв.м', keywords: ['ковролин'] },
]

export const WALL_MATS: MatOption[] = [
  { id: 'paint', icon: '🖌️', name: 'Краска', sub: 'кв.м', keywords: ['краск', 'окрас'] },
  { id: 'wallpaper', icon: '🗞️', name: 'Обои', sub: 'рулоны', keywords: ['обои'] },
  { id: 'tile', icon: '🟦', name: 'Плитка', sub: 'кв.м', keywords: ['плитк'] },
  { id: 'plaster', icon: '⬜', name: 'Штукатурка', sub: 'м³', keywords: ['штукатур', 'шпакл'] },
  { id: 'panel', icon: '🟫', name: 'Панели', sub: 'кв.м', keywords: ['панел'] },
]

export const CEIL_MATS: MatOption[] = [
  { id: 'paint', icon: '🖌️', name: 'Краска', sub: 'кв.м', keywords: ['краск', 'потолок'] },
  { id: 'stretch', icon: '🎨', name: 'Натяжной', sub: 'кв.м', keywords: ['натяж'] },
  { id: 'gypsum', icon: '🔲', name: 'Гипсокартон', sub: 'листы', keywords: ['гипс', 'гкл'] },
  { id: 'mineral', icon: '⬛', name: 'Минеральная', sub: 'плитки', keywords: ['минeral', 'минерал', ' Armstrong'] },
]

export type ChecklistItem = { id: string; group: string; name: string; sub: string }

export const PLANNER_CHECKLIST: ChecklistItem[] = [
  { id: 'c1', group: 'Подготовка', name: 'Разработка проекта', sub: 'Замеры, план-схема' },
  { id: 'c2', group: 'Подготовка', name: 'Демонтаж старого покрытия', sub: 'Пол, стены, потолок' },
  { id: 'c3', group: 'Основание', name: 'Стяжка пола', sub: 'Цементно-песчаная, 5–7 см' },
  { id: 'c4', group: 'Основание', name: 'Выравнивание стен', sub: 'Штукатурка, шпатлёвка' },
  { id: 'c5', group: 'Коммуникации', name: 'Электропроводка', sub: 'Замена / новая разводка' },
  { id: 'c6', group: 'Коммуникации', name: 'Сантехника', sub: 'Трубы, точки водоснабжения' },
  { id: 'c7', group: 'Отделка', name: 'Укладка напольного покрытия', sub: 'Ламинат / плитка / паркет' },
  { id: 'c8', group: 'Отделка', name: 'Покраска стен / обои', sub: 'Грунтовка + финишный слой' },
  { id: 'c9', group: 'Отделка', name: 'Монтаж потолка', sub: 'Краска / натяжной / гкл' },
  { id: 'c10', group: 'Финал', name: 'Установка дверей и плинтусов', sub: 'Межкомнатные двери, откосы' },
  { id: 'c11', group: 'Финал', name: 'Чистовая уборка', sub: 'Вынос строительного мусора' },
]

export function findMatLabel(mats: MatOption[], id: string): MatOption | undefined {
  return mats.find((m) => m.id === id)
}
