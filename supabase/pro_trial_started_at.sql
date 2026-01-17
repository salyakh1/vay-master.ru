-- ============================================
-- PRO / Trial start: единая точка старта для существующих аккаунтов
-- ============================================
-- Добавляет поле pro_trial_started_at и проставляет его "сейчас"
-- для уже существующих мастеров/продавцов, у кого оно ещё не задано.
--
-- ВАЖНО:
-- - Для новых регистраций (после применения) логика в приложении использует:
--   pro_trial_started_at (если есть) иначе created_at.
-- - Поэтому новые аккаунты начнут trial с момента регистрации автоматически.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pro_trial_started_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_pro_trial_started_at
ON public.profiles (pro_trial_started_at);

-- Проставляем старт trial "сейчас" для существующих мастеров/продавцов
UPDATE public.profiles
SET pro_trial_started_at = NOW()
WHERE role IN ('master', 'seller')
  AND pro_trial_started_at IS NULL;

