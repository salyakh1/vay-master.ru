-- Добавление поля image_url в таблицу messages
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Комментарий к полю
COMMENT ON COLUMN public.messages.image_url IS 'URL изображения, прикрепленного к сообщению';

-- Изменение ограничения content, чтобы разрешить пустые строки (для сообщений только с изображениями)
-- Если поле content имеет NOT NULL constraint, его нужно изменить
ALTER TABLE public.messages
ALTER COLUMN content DROP NOT NULL;

-- Или если нужно разрешить только пустые строки, но не NULL:
-- ALTER TABLE public.messages
-- ALTER COLUMN content SET DEFAULT '';

