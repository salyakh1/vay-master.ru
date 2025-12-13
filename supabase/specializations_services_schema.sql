-- Specializations and services reference data

-- Specializations
CREATE TABLE IF NOT EXISTS public.specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  specialization_id UUID NOT NULL REFERENCES public.specializations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (specialization_id, name),
  UNIQUE (specialization_id, slug)
);

-- Master selections: many-to-many
CREATE TABLE IF NOT EXISTS public.profile_specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialization_id UUID NOT NULL REFERENCES public.specializations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, specialization_id)
);

CREATE TABLE IF NOT EXISTS public.profile_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, service_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_specialization ON public.services(specialization_id);
CREATE INDEX IF NOT EXISTS idx_profile_specializations_profile ON public.profile_specializations(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_services_profile ON public.profile_services(profile_id);

-- RLS
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_services ENABLE ROW LEVEL SECURITY;

-- Policies: reference data is readable by everyone
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'specializations' AND policyname = 'specializations select all') THEN
    CREATE POLICY "specializations select all" ON public.specializations
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services select all') THEN
    CREATE POLICY "services select all" ON public.services
      FOR SELECT USING (true);
  END IF;
END$$;

-- Policies: masters manage only their own selections
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_specializations' AND policyname = 'profile_specializations select all') THEN
    CREATE POLICY "profile_specializations select all" ON public.profile_specializations
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_specializations' AND policyname = 'profile_specializations insert own') THEN
    CREATE POLICY "profile_specializations insert own" ON public.profile_specializations
      FOR INSERT WITH CHECK (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_specializations' AND policyname = 'profile_specializations delete own') THEN
    CREATE POLICY "profile_specializations delete own" ON public.profile_specializations
      FOR DELETE USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_services' AND policyname = 'profile_services select all') THEN
    CREATE POLICY "profile_services select all" ON public.profile_services
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_services' AND policyname = 'profile_services insert own') THEN
    CREATE POLICY "profile_services insert own" ON public.profile_services
      FOR INSERT WITH CHECK (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_services' AND policyname = 'profile_services delete own') THEN
    CREATE POLICY "profile_services delete own" ON public.profile_services
      FOR DELETE USING (auth.uid() = profile_id);
  END IF;
END$$;

-- Optional: prevent inserts/updates of reference data from anon users
-- (dashboard/SQL scripts bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'specializations' AND policyname = 'specializations insert service_role') THEN
    CREATE POLICY "specializations insert service_role" ON public.specializations
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services insert service_role') THEN
    CREATE POLICY "services insert service_role" ON public.services
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;
