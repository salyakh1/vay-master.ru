# Быстрый старт

## 1. Установка зависимостей

```bash
npm install
```

## 2. Настройка Supabase

1. Создайте аккаунт на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Перейдите в SQL Editor
4. Скопируйте и выполните содержимое файла `supabase/schema.sql`
5. Перейдите в Settings → API
6. Скопируйте:
   - Project URL
   - anon public key

## 3. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Запуск проекта

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## 5. Развертывание на Vercel

1. Подключите репозиторий к [Vercel](https://vercel.com)
2. Добавьте переменные окружения в настройках проекта:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Деплой запустится автоматически

## Структура приложения

- `/` - Главная страница (редирект на /feed если авторизован)
- `/auth/register` - Регистрация с выбором роли
- `/auth/login` - Вход
- `/feed` - Лента публикаций (как VK)
- `/profile/[id]` - Профиль пользователя
- `/profile/edit` - Редактирование профиля
- `/chats` - Список чатов
- `/chats/[id]` - Открытый чат
- `/products` - Каталог товаров (для продавцов)
- `/products/new` - Добавление товара
- `/products/[id]` - Страница товара

## Роли

- **Мастер** - может создавать посты, общаться с клиентами
- **Продавец** - может создавать товары, управлять каталогом
- **Клиент** - может просматривать ленту, искать товары и мастеров


