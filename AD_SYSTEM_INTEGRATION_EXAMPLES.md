# Примеры интеграции AdSlot

## 1. Главная страница (Hero реклама)

**Файл:** `app/page.tsx`

```tsx
import AdSlot from '@/components/AdSlot'

// Заменить существующий AdBannerSlider на:
<AdSlot 
  type="HERO_SPONSORED" 
  context={{ page: 'home' }}
  className="mb-12"
/>
```

## 2. Поиск мастеров (Inline контекстная реклама)

**Файл:** `app/search/page.tsx`

```tsx
import AdSlot from '@/components/AdSlot'

// В списке мастеров, после каждых 5 карточек:
{masters.map((master, i) => (
  <React.Fragment key={master.id}>
    <MasterCard master={master} />
    {i > 0 && i % 5 === 0 && (
      <AdSlot 
        type="INLINE_CONTEXT" 
        context={{ 
          page: 'search', 
          category: selectedSpec ? [selectedSpec] : undefined,
          city: cityFilter || undefined
        }}
        index={i}
        className="my-4"
      />
    )}
  </React.Fragment>
))}
```

## 3. Каталог товаров (Sponsored Card)

**Файл:** `app/products/page.tsx`

```tsx
import AdSlot from '@/components/AdSlot'

// В списке товаров, после каждых 6 товаров:
{products.map((product, i) => (
  <React.Fragment key={product.id}>
    <ProductCard product={product} />
    {i > 0 && i % 6 === 0 && (
      <AdSlot 
        type="SPONSORED_CARD" 
        context={{ 
          page: 'products',
          category: product.category_ref?.section ? [product.category_ref.section] : undefined,
          city: cityFilter || undefined
        }}
        index={i}
        className="col-span-2 my-4"
      />
    )}
  </React.Fragment>
))}
```

## 4. Профиль мастера (Profile Related)

**Файл:** `app/profile/[id]/page.tsx`

```tsx
import AdSlot from '@/components/AdSlot'

// После основной информации о мастере:
{profile && (
  <div className="mt-6">
    <AdSlot 
      type="PROFILE_RELATED" 
      context={{ 
        masterId: profile.id,
        specialization: profile.specialization || undefined
      }}
      className="mb-6"
    />
  </div>
)}
```

## 5. Футер (Brand логотипы)

**Файл:** `components/Footer.tsx` (если есть) или `app/layout.tsx`

```tsx
import AdSlot from '@/components/AdSlot'

<footer className="border-t border-border-color py-6">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-center gap-8 flex-wrap">
      <AdSlot type="FOOTER_BRAND" />
    </div>
  </div>
</footer>
```

## 6. Лента (Feed) - Inline контекстная

**Файл:** `app/feed/page.tsx`

```tsx
import AdSlot from '@/components/AdSlot'

{items.map((item, i) => (
  <React.Fragment key={item.id}>
    <PostCard post={item} />
    {i > 0 && i % 4 === 0 && (
      <AdSlot 
        type="INLINE_CONTEXT" 
        context={{ page: 'feed' }}
        index={i}
        className="my-4"
      />
    )}
  </React.Fragment>
))}
```

## Важные замечания

1. **Не заменяйте AdBannerSlider полностью** - он может использоваться для HERO_SPONSORED на главной странице
2. **Контекст важен** - передавайте максимально полный контекст для лучшего таргетинга
3. **Индекс для INLINE_CONTEXT** - используйте `index={i}` для правильного позиционирования
4. **Обработка ошибок** - компонент AdSlot не показывает ошибки, просто не рендерит рекламу если её нет

## Миграция существующих страниц

### Шаг 1: Импорт
```tsx
import AdSlot from '@/components/AdSlot'
```

### Шаг 2: Определить тип рекламы
- Hero блоки → `HERO_SPONSORED`
- Между карточками → `INLINE_CONTEXT`
- В списках → `SPONSORED_CARD`
- В профиле → `PROFILE_RELATED`
- Футер → `FOOTER_BRAND`

### Шаг 3: Передать контекст
Соберите максимально полный контекст:
- Текущая страница
- Категории/специализации
- Город пользователя
- Поисковый запрос (ключевые слова)

### Шаг 4: Интегрировать в список
Для INLINE_CONTEXT и SPONSORED_CARD используйте `index` и показывайте каждые N элементов.
