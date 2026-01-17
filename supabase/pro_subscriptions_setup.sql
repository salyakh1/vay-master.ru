-- ============================================
-- PRO / Подписки: поля профиля + feature flags
-- ============================================
-- Примените этот SQL скрипт в Supabase SQL Editor

-- 1) Поля подписки в profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pro_until timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_pro_until ON public.profiles (pro_until);

-- 2) Feature flags для отключения ограничений одним кликом (через system_settings)
INSERT INTO public.system_settings (key, value, description, category)
VALUES
  ('pro_disable_master_restrictions', 'false'::jsonb, 'Отключить PRO-ограничения для мастеров (истории/портфолио/отклики/скрытие ФИО)', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category)
VALUES
  ('pro_disable_seller_restrictions', 'false'::jsonb, 'Отключить PRO-ограничения для продавцов (подписка/лимиты)', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

