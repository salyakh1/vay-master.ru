# Аудит Core Web Vitals и внесённые изменения

## 1. НАЙДЕННЫЕ ПРОБЛЕМЫ

### Critical (above-the-fold, initial render)
- **Блокировка первого кадра авторизацией** — при `loading === true` показывался полноэкранный «Загрузка...», LCP откладывался до завершения getSession + fetchUser. *Исправлено ранее: показываем hero + гостевые CTA.*
- **Баннер выше hero** — блок баннеров рендерился первым и мог становиться LCP (картинка), задерживая отрисовку заголовка. *Исправлено: hero первым, баннер после.*
- **AdBannerSlider в initial bundle** — компонент и его запрос `/api/banners` выполнялись сразу при монтировании, конкурируя с LCP. *Исправлено: dynamic import + отложенный fetch (rAF + setTimeout).*
- **ProblemEntryModal в layout** — модалка загружалась на каждой странице и рендерилась в DOM. *Исправлено: только на главной, dynamic import.*

### Deferred (ниже первого экрана)
- **Все секции главной в одном рендере** — «Для кого», «Как работает», «Безопасность», «В цифрах» и т.д. рендерились сразу, увеличивая DOM и время до интерактивности. *Исправлено: одна LazySection с Intersection Observer, контент ниже первого экрана рендерится при скролле.*

### On-demand (модалки, карты)
- **Footer в layout** — подключался в общий chunk. *Исправлено: dynamic import с ssr: false.*

### Данные и API
- **Запрос баннеров при монтировании** — не откладывался после первого кадра. *Исправлено: requestAnimationFrame + setTimeout(0) перед fetch.*

### CLS
- **Резерв места под баннер** — уже был (фиксированная высота + плейсхолдер при загрузке).
- **Резерв высоты шапки для гостей** — уже был (h-32 как у Navbar).

---

## 2. КОНКРЕТНЫЕ ИЗМЕНЕНИЯ В КОДЕ

### `app/layout.tsx`
- Удалён импорт и рендер `ProblemEntryModal` (модалка больше не в layout).
- Footer подключается через `dynamic(() => import('@/components/Footer'), { ssr: false })`.

### `app/page.tsx`
- Hero-блок перенесён в начало контента (сразу после шапки), перед баннерами — **LCP = h1**.
- Добавлены dynamic import для `AdBannerSlider` (с `loading`-плейсхолдером фиксированной высоты) и `ProblemEntryModal`.
- Импорт `LazySection`; все секции ниже первого экрана (блоки 2–7) обёрнуты в один `<LazySection minHeight="600px">`.
- Баннеры вынесены в блок после hero с отступом `-mx-4` для полной ширины.
- В конце главной рендерится `<ProblemEntryModal />` (компонент загружается только на главной).

### `components/LazySection.tsx` (новый)
- Компонент принимает `children`, `minHeight`, `rootMargin`.
- До попадания в viewport рендерит только `<div ref={ref} style={{ minHeight }} aria-hidden />`.
- При пересечении (Intersection Observer) рендерит `children`. Сокращает начальный DOM и откладывает работу ниже первого экрана.

### `components/AdBannerSlider.tsx`
- Загрузка баннеров перенесена в отложенный запуск: `requestAnimationFrame` → `setTimeout(0)` → `fetch(...)`. Запрос не конкурирует с первым кадром.
- При смене `page` вызывается `trackedViewsRef.current.clear()` и повторный запрос.
- Отдельный `useEffect` для очистки `trackViewTimeoutRef` при размонтировании.

---

## 3. ЧЕКЛИСТ ИСПРАВЛЕНИЙ

| # | Проблема | Действие |
|---|----------|----------|
| 1 | LCP > 2.5s из‑за ожидания auth и баннера | Hero первым, один LCP (h1); баннер и запрос баннеров отложены |
| 2 | Баннер в initial bundle и при монтировании | Dynamic import AdBannerSlider + отложенный fetch (rAF + setTimeout) |
| 3 | Модалка в layout на всех страницах | ProblemEntryModal только на главной, dynamic import |
| 4 | Ниже первого экрана рендерится сразу | LazySection с Intersection Observer для блоков 2–7 |
| 5 | Footer в общем chunk | Dynamic import Footer в layout, ssr: false |
| 6 | Запрос баннеров блокирует первый кадр | Fetch после первого кадра (rAF + setTimeout) |
| 7 | Резерв места под баннер | Сохранён: фиксированная высота + плейсхолдер при loading |
| 8 | Резерв высоты шапки | Сохранён: h-32 для гостей, как у Navbar |

---

## 4. ОЖИДАЕМЫЙ ЭФФЕКТ

- **LCP**: первый значимый контент — заголовок hero (h1), без ожидания auth и баннеров; цель < 2.5 s на mobile.
- **CLS**: фиксированная шапка и место под баннер, LazySection с minHeight уменьшают сдвиги; цель < 0.05.
- **Speed Index**: меньше DOM и JS на первом кадре за счёт LazySection и dynamic импортов; цель < 3.5 s.
- **Performance**: меньший initial JS (Footer, AdBannerSlider, ProblemEntryModal в отдельных chunks), отложенные запросы и рендер ниже первого экрана; цель 80–90+.

---

## 5. НЕ ТРОГАЛОСЬ (без изменений)

- Карты (Leaflet) — уже dynamic в своих компонентах (StoresMap, MasterRadiusPicker и т.д.).
- Модалки на других страницах (OrderResponseModal, ProUpgradeModal и т.д.) — уже dynamic.
- Шрифты (Inter, Manrope) — оставлен `display: 'swap'`.
- Изображения баннеров — по-прежнему `fetchPriority="high"` только у первого, размеры заданы.
- Статистика на главной — по-прежнему загружается по Intersection Observer при скролле до блока.
