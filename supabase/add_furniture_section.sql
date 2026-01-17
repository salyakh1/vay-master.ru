-- Migration: Add furniture section to product_categories
-- This script updates the existing constraint and adds furniture categories

-- Step 1: Drop old constraint if it exists
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'product_categories_section_check' 
    AND table_name = 'product_categories'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.product_categories DROP CONSTRAINT product_categories_section_check;
    RAISE NOTICE 'Dropped old constraint';
  END IF;
END$$;

-- Step 2: Add new constraint with furniture section
ALTER TABLE public.product_categories 
ADD CONSTRAINT product_categories_section_check 
CHECK (section IN ('instruments', 'autoparts', 'materials', 'furniture'));

-- Step 3: Insert furniture categories
INSERT INTO public.product_categories (section, name, slug)
VALUES
  ('furniture','Гостиная (диваны, кресла, журнальные столы, ТВ-тумбы)','furniture-living-room'),
  ('furniture','Спальня (кровати, матрасы, шкафы, комоды)','furniture-bedroom'),
  ('furniture','Кухня (кухонные гарнитуры, столы, стулья)','furniture-kitchen'),
  ('furniture','Столовая (обеденные столы, стулья, серванты)','furniture-dining-room'),
  ('furniture','Детская (детские кровати, шкафы, столы)','furniture-kids-room'),
  ('furniture','Офисная (офисные столы, кресла, шкафы)','furniture-office'),
  ('furniture','Прихожая (шкафы-купе, вешалки, банкетки)','furniture-hallway'),
  ('furniture','Ванная (тумбы, зеркала, полки)','furniture-bathroom'),
  ('furniture','Мягкая мебель (диваны, кресла, пуфы)','furniture-upholstered'),
  ('furniture','Корпусная мебель (шкафы, комоды, тумбы)','furniture-case'),
  ('furniture','Столы (письменные, обеденные, журнальные)','furniture-tables'),
  ('furniture','Стулья и кресла (обеденные, офисные, барные)','furniture-chairs'),
  ('furniture','Матрасы и основания (матрасы, ортопедические основания)','furniture-mattresses'),
  ('furniture','Мебель для хранения (стеллажи, полки, комоды)','furniture-storage'),
  ('furniture','Мебель для сада и террасы (садовые столы, стулья)','furniture-garden'),
  ('furniture','Мебель для балкона (полки, стеллажи, складная)','furniture-balcony'),
  ('furniture','Мебель на заказ (индивидуальное изготовление)','furniture-custom')
ON CONFLICT (section, name) DO NOTHING;
