-- Добавление поля cover_photo_url в таблицу profiles
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Комментарий к полю
COMMENT ON COLUMN public.profiles.cover_photo_url IS 'URL фоновой картинки профиля';

