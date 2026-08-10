-- Цены мастера по услугам (profile_services)
-- Выполнить один раз в Supabase SQL Editor.

ALTER TABLE public.profile_services
  ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) NULL,
  ADD COLUMN IF NOT EXISTS price_unit TEXT NULL;

COMMENT ON COLUMN public.profile_services.price IS 'Цена мастера за услугу (руб.)';
COMMENT ON COLUMN public.profile_services.price_unit IS 'Единица: m | m2 | m3';

ALTER TABLE public.profile_services
  DROP CONSTRAINT IF EXISTS profile_services_price_unit_check;

ALTER TABLE public.profile_services
  ADD CONSTRAINT profile_services_price_unit_check
  CHECK (price_unit IS NULL OR price_unit IN ('m', 'm2', 'm3'));

ALTER TABLE public.profile_services
  DROP CONSTRAINT IF EXISTS profile_services_price_nonneg;

ALTER TABLE public.profile_services
  ADD CONSTRAINT profile_services_price_nonneg
  CHECK (price IS NULL OR price >= 0);

-- Обновление своих строк (раньше был только insert/delete)
DROP POLICY IF EXISTS "profile_services update own" ON public.profile_services;
CREATE POLICY "profile_services update own" ON public.profile_services
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
