-- ШАГ 1: СОЗДАНИЕ ТАБЛИЦЫ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Если таблица уже существует, но с ошибками - удалите её вручную через Table Editor
-- Затем выполните этот скрипт

-- Проверяем и удаляем таблицу, если она существует неправильно
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'complaints') THEN
    DROP TABLE public.complaints CASCADE;
  END IF;
END $$;

-- Создаем таблицу заново
CREATE TABLE public.complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  complainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  admin_notes TEXT
);

-- Создаем индексы
CREATE INDEX idx_complaints_complainer ON public.complaints(complainer_id);
CREATE INDEX idx_complaints_reported_user ON public.complaints(reported_user_id);
CREATE INDEX idx_complaints_chat ON public.complaints(chat_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);

-- Включаем RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Добавляем поле в таблицу chats
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS deleted_by_user_ids UUID[] DEFAULT ARRAY[]::UUID[];

