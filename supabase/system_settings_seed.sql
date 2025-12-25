-- ============================================
-- Примеры системных настроек для админ-панели
-- ============================================
-- Примените этот SQL скрипт в Supabase SQL Editor

-- Feature Flags (Флаги функциональности)
INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_new_registration', 'true'::jsonb, 'Разрешить новую регистрацию пользователей', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_master_verification', 'true'::jsonb, 'Включить верификацию мастеров', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_portfolio_uploads', 'true'::jsonb, 'Разрешить загрузку работ в портфолио', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_product_listings', 'true'::jsonb, 'Разрешить создание объявлений о товарах', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_order_creation', 'true'::jsonb, 'Разрешить создание заказов', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_chat_messaging', 'true'::jsonb, 'Включить систему сообщений', 'feature_flags')
ON CONFLICT (key) DO NOTHING;

-- Limits (Лимиты)
INSERT INTO public.system_settings (key, value, description, category) VALUES
('max_orders_per_user', '10'::jsonb, 'Максимальное количество активных заказов на пользователя', 'limits')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('max_portfolio_items', '50'::jsonb, 'Максимальное количество работ в портфолио мастера', 'limits')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('max_products_per_seller', '100'::jsonb, 'Максимальное количество товаров у продавца', 'limits')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('max_images_per_portfolio', '10'::jsonb, 'Максимальное количество изображений в одной работе', 'limits')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('max_images_per_product', '10'::jsonb, 'Максимальное количество изображений у товара', 'limits')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('max_order_responses', '20'::jsonb, 'Максимальное количество откликов на один заказ', 'limits')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('message_rate_limit', '50'::jsonb, 'Максимальное количество сообщений в час', 'limits')
ON CONFLICT (key) DO NOTHING;

-- Regions (Регионы)
INSERT INTO public.system_settings (key, value, description, category) VALUES
('available_cities', '["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", "Нижний Новгород", "Челябинск", "Самара"]'::jsonb, 'Список доступных городов для регистрации', 'regions')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('default_city', '"Москва"'::jsonb, 'Город по умолчанию при регистрации', 'regions')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('enable_regional_filtering', 'true'::jsonb, 'Включить фильтрацию по регионам', 'regions')
ON CONFLICT (key) DO NOTHING;

-- A/B Testing (A/B тестирование)
INSERT INTO public.system_settings (key, value, description, category) VALUES
('ab_test_registration_flow', '"variant_a"'::jsonb, 'Вариант потока регистрации (variant_a/variant_b)', 'ab_testing')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('ab_test_search_algorithm', '"default"'::jsonb, 'Алгоритм поиска (default/improved)', 'ab_testing')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('ab_test_pricing_display', '"variant_a"'::jsonb, 'Вариант отображения цен (variant_a/variant_b)', 'ab_testing')
ON CONFLICT (key) DO NOTHING;

-- System (Системные)
INSERT INTO public.system_settings (key, value, description, category) VALUES
('maintenance_mode', 'false'::jsonb, 'Режим технического обслуживания', 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('maintenance_message', '"Сайт временно недоступен. Мы скоро вернемся!"'::jsonb, 'Сообщение при техническом обслуживании', 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('email_notifications_enabled', 'true'::jsonb, 'Включить email уведомления', 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('sms_notifications_enabled', 'false'::jsonb, 'Включить SMS уведомления', 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('auto_moderate_new_content', 'false'::jsonb, 'Автоматическая модерация нового контента', 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('require_email_verification', 'true'::jsonb, 'Требовать подтверждение email при регистрации', 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('session_timeout_minutes', '60'::jsonb, 'Таймаут сессии в минутах', 'system')
ON CONFLICT (key) DO NOTHING;

