-- ШАГ 1: СОЗДАНИЕ ТАБЛИЦЫ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Этот скрипт сначала удалит таблицу (если она существует неправильно), затем создаст заново
-- Скопируйте ВСЁ ниже и вставьте в Supabase SQL Editor, затем нажмите Run

-- Удаляем таблицу, если она существует (чтобы создать заново правильно)
DROP TABLE IF EXISTS public.complaints CASCADE;

-- Теперь создаем таблицу заново
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

-- Добавляем поле в таблицу chats (если еще не добавлено)
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS deleted_by_user_ids UUID[] DEFAULT ARRAY[]::UUID[];

