-- ПОЛНЫЙ СКРИПТ: Создание таблицы complaints с правильным порядком выполнения
-- Выполните ЭТОТ файл целиком в Supabase SQL Editor
-- Он автоматически удалит старые политики (если есть) и создаст все заново

-- ШАГ 1: Удаление существующих политик (если они есть)
DROP POLICY IF EXISTS "Users can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can view own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON public.complaints;

-- ШАГ 2: Создание таблицы (если еще не создана)
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

-- ШАГ 3: Создание индексов
CREATE INDEX IF NOT EXISTS idx_complaints_complainer ON public.complaints(complainer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reported_user ON public.complaints(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_chat ON public.complaints(chat_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);

-- ШАГ 4: Включение RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- ШАГ 5: Добавление поля для удаленных чатов
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS deleted_by_user_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- ШАГ 6: Комментарии
COMMENT ON TABLE public.complaints IS 'Жалобы пользователей на других пользователей или чаты';
COMMENT ON COLUMN public.complaints.status IS 'Статус жалобы: new, in_progress, resolved, rejected';
COMMENT ON COLUMN public.chats.deleted_by_user_ids IS 'Массив ID пользователей, которые удалили этот чат';

-- ШАГ 7: Создание RLS политик (только после создания таблицы!)
CREATE POLICY "Users can create complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = complainer_id);

CREATE POLICY "Users can view own complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (auth.uid() = complainer_id);

CREATE POLICY "Admins can view all complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'moderator')
  )
);

CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'moderator')
  )
);

