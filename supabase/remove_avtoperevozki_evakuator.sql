-- Удаление категории «Автоперевозки» (и подкатегорий/услуг: Пассажирские перевозки, Трансфер, Эвакуатор).
-- Выполни в Supabase SQL Editor. После этого категория и эвакуатор не будут отображаться в приложении.

-- Сначала подкатегории (услуги удалятся по CASCADE, если настроен)
DELETE FROM public.subcategories
WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'avtoperevozki');

-- Затем саму категорию
DELETE FROM public.categories
WHERE slug = 'avtoperevozki';
