-- Add new fields for masters and sellers to profiles table

-- Fields for masters
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS services TEXT,
  ADD COLUMN IF NOT EXISTS service_location TEXT CHECK (service_location IN ('home', 'workshop', 'both')),
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS work_schedule TEXT;

-- Fields for sellers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_address TEXT,
  ADD COLUMN IF NOT EXISTS work_hours TEXT,
  ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_zones TEXT,
  ADD COLUMN IF NOT EXISTS product_categories TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.services IS 'List of services provided by master';
COMMENT ON COLUMN public.profiles.service_location IS 'Where master provides services: home, workshop, or both';
COMMENT ON COLUMN public.profiles.experience_years IS 'Years of experience';
COMMENT ON COLUMN public.profiles.specialization IS 'Master specialization/categories';
COMMENT ON COLUMN public.profiles.work_schedule IS 'Working hours schedule';
COMMENT ON COLUMN public.profiles.store_address IS 'Store/warehouse address for seller';
COMMENT ON COLUMN public.profiles.work_hours IS 'Working hours for seller';
COMMENT ON COLUMN public.profiles.delivery_available IS 'Whether seller provides delivery';
COMMENT ON COLUMN public.profiles.delivery_zones IS 'Delivery zones/areas';
COMMENT ON COLUMN public.profiles.product_categories IS 'Product categories sold by seller';

