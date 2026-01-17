# Архитектура системы рекламы VAY-MASTER

## Обзор

Система рекламы построена на принципе **DATA + RULES**: любой рекламный элемент управляется из админки и показывается на основе контекста страницы.

## Типы рекламы (AdType)

### HERO_SPONSORED
- **Где**: Главная страница, страницы категорий
- **Формат**: Большие промо-блоки вверху страницы
- **Ограничения**: Только 1 рекламодатель за раз, ротация по датам
- **Компонент**: `<AdSlot type="HERO_SPONSORED" />`

### INLINE_CONTEXT
- **Где**: Между карточками мастеров/товаров
- **Формат**: Контекстная реклама с бейджем "Реклама"
- **Ограничения**: Показывается каждые 4-6 карточек, только при совпадении категории
- **Компонент**: `<AdSlot type="INLINE_CONTEXT" index={i} />`

### SPONSORED_CARD
- **Где**: В списках мастеров или продавцов
- **Формат**: Визуально похоже на карточку, но с рамкой и бейджем
- **Ограничения**: Не более 1 на экран
- **Компонент**: `<AdSlot type="SPONSORED_CARD" />`

### PROFILE_RELATED
- **Где**: Внутри профиля мастера
- **Формат**: Под основной информацией
- **Ограничения**: Строго по профессии мастера
- **Компонент**: `<AdSlot type="PROFILE_RELATED" context={{ masterId, specialization }} />`

### FOOTER_BRAND
- **Где**: Футер сайта
- **Формат**: Логотипы партнёров
- **Ограничения**: Минимум визуального шума
- **Компонент**: `<AdSlot type="FOOTER_BRAND" />`

## Контекстный показ

Контекст формируется из:
- `page` - текущая страница
- `category` - категории товаров/услуг
- `keywords` - ключевые слова из поиска
- `city` - город пользователя
- `masterId` - ID мастера (для PROFILE_RELATED)
- `specialization` - специализация мастера

### Логика показа

Реклама показывается ТОЛЬКО если:
1. ✅ Категория рекламы совпадает с контекстом ИЛИ категория не указана
2. ✅ Регион совпадает ИЛИ регион = "ALL"
3. ✅ Реклама активна по датам (start_date, end_date)
4. ✅ Не достигнут лимит показов/кликов
5. ✅ Страница входит в список `pages`

## Структура данных

### Таблица `ad_banners`

**Базовые поля:**
- `id`, `title`, `description`, `image_url`
- `type` (legacy), `ad_type` (новый)
- `target_type`, `target_id`, `external_url`
- `pages[]`, `priority`, `is_active`
- `start_date`, `end_date`, `duration`
- `views`, `clicks`

**Новые поля для контекста:**
- `category[]` - категории для контекстного показа
- `keywords[]` - ключевые слова
- `regions[]` - регионы показа (["ALL"] = везде)
- `brand_name` - название бренда

**Поля для монетизации:**
- `pricing_model` - 'fixed' | 'cpc' | 'cpa'
- `price_per_click` - цена за клик (CPC)
- `price_per_action` - цена за действие (CPA)
- `fixed_price` - фиксированная цена
- `affiliate_url` - аффилиатная ссылка

**Лимиты:**
- `impression_limit` - лимит показов
- `click_limit` - лимит кликов
- `current_impressions` - текущие показы
- `current_clicks` - текущие клики

**Маркировка:**
- `show_badge` - показывать бейдж
- `badge_text` - текст бейджа (по умолчанию "Реклама")

## API Endpoints

### GET `/api/ads`
Получение контекстной рекламы.

**Параметры:**
- `type` (required) - тип рекламы
- `page` - страница
- `category` - JSON массив категорий
- `keywords` - JSON массив ключевых слов
- `city` - город
- `masterId` - ID мастера
- `specialization` - специализация

**Ответ:**
```json
{
  "ad": {
    "id": "...",
    "title": "...",
    "image_url": "...",
    ...
  }
}
```

### POST `/api/ads/[id]/impression`
Отслеживание показа рекламы.

### POST `/api/ads/[id]/click`
Отслеживание клика по рекламе.

## Компонент AdSlot

### Использование

```tsx
import AdSlot from '@/components/AdSlot'

// Hero реклама
<AdSlot type="HERO_SPONSORED" context={{ page: 'home' }} />

// Контекстная реклама между карточками
{items.map((item, i) => (
  <>
    <ItemCard item={item} />
    {i % 5 === 0 && (
      <AdSlot 
        type="INLINE_CONTEXT" 
        context={{ page: 'search', category: ['roofing'] }}
        index={i}
      />
    )}
  </>
))}

// Реклама в профиле
<AdSlot 
  type="PROFILE_RELATED" 
  context={{ masterId: master.id, specialization: master.specialization }}
/>
```

### Props

- `type: AdType` - тип рекламы (required)
- `context?: AdContext` - контекст показа
- `className?: string` - дополнительные CSS классы
- `maxWidth?: string` - максимальная ширина
- `showBadge?: boolean` - показывать бейдж (default: true)
- `position?: 'before' | 'after' | 'inline'` - позиция (default: 'inline')
- `index?: number` - индекс для INLINE_CONTEXT

## Админ-панель

### Страница: `/admin/banners`

**Функции:**
- ✅ Список всех рекламных кампаний
- ✅ Создание / редактирование / отключение
- ✅ Фильтрация по типу, бренду, статусу
- ✅ Статистика (показы, клики, CTR)

**Поля формы:**
- Базовые: название, описание, изображение, тип
- Контекст: категории, ключевые слова, регионы
- Монетизация: модель оплаты, цены
- Лимиты: показы, клики
- Маркировка: бейдж

## Ограничения и правила

1. ✅ Никакие сторонние скрипты (Adsense и т.п.)
2. ✅ Рекламодатель НЕ управляет дизайном
3. ✅ Только шаблоны сайта
4. ✅ Всегда маркировка "Реклама" или "Партнёр"
5. ✅ Реклама не может превышать 30% контента страницы

## Модели монетизации

### Fixed (Фиксированная)
- Оплата за период
- Поле: `fixed_price`

### CPC (Cost Per Click)
- Оплата за клик
- Поле: `price_per_click`
- Отслеживание через `/api/ads/[id]/click`

### CPA (Cost Per Action)
- Оплата за действие
- Поле: `price_per_action`
- Аффилиатная ссылка: `affiliate_url`

## Интеграция в страницы

### Главная страница
```tsx
<AdSlot type="HERO_SPONSORED" context={{ page: 'home' }} />
```

### Поиск мастеров
```tsx
{masters.map((master, i) => (
  <>
    <MasterCard master={master} />
    {i > 0 && i % 5 === 0 && (
      <AdSlot 
        type="INLINE_CONTEXT" 
        context={{ page: 'search', category: [category] }}
        index={i}
      />
    )}
  </>
))}
```

### Профиль мастера
```tsx
<AdSlot 
  type="PROFILE_RELATED" 
  context={{ masterId: master.id, specialization: master.specialization }}
/>
```

### Футер
```tsx
<AdSlot type="FOOTER_BRAND" />
```

## Миграция

Выполните SQL скрипт:
```sql
-- supabase/ad_system_migration.sql
```

Это добавит:
- Новые поля в таблицу `ad_banners`
- Функцию `get_contextual_ads()` для контекстного поиска
- Обновленные функции для отслеживания показов/кликов с лимитами
- Индексы для оптимизации

## Статистика

В админ-панели доступна статистика:
- Общее количество показов
- Общее количество кликов
- CTR (Click-Through Rate) = клики / показы
- Текущие показы/клики vs лимиты

## Безопасность

- RLS политики для доступа к рекламе
- Только админы могут создавать/редактировать
- Все пользователи могут видеть активную рекламу
- Отслеживание показов/кликов через SECURITY DEFINER функции
