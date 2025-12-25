-- ЧАСТЬ 1: Создание таблицы и индексов
-- Выполните ЭТУ часть ПЕРВОЙ в Supabase SQL Editor

-- Создание таблицы для жалоб
CREATE TABLE IF NOT EXISTS public.complaints (
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

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_complaints_complainer ON public.complaints(complainer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reported_user ON public.complaints(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_chat ON public.complaints(chat_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);

-- Включение RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Добавление поля для отслеживания удаленных чатов пользователями
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS deleted_by_user_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Комментарии
COMMENT ON TABLE public.complaints IS 'Жалобы пользователей на других пользователей или чаты';
COMMENT ON COLUMN public.complaints.status IS 'Статус жалобы: new, in_progress, resolved, rejected';
COMMENT ON COLUMN public.chats.deleted_by_user_ids IS 'Массив ID пользователей, которые удалили этот чат';

