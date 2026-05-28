-- Настройки оплаты (категория system). Выполнить в Supabase SQL Editor после деплоя.
INSERT INTO public.system_settings (key, value, description, category) VALUES
('payment_order_publication_enabled', 'true'::jsonb, 'Требовать оплату перед публикацией заказа (если выключено — заказ создаётся без модалки оплаты)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('order_publication_price_rub', '199'::jsonb, 'Стоимость публикации заказа (₽)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('payment_tinkoff_enabled', 'false'::jsonb, 'Включить оплату через Тинькофф (нужны TINKOFF_TERMINAL_KEY и TINKOFF_PASSWORD в .env на сервере)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('payment_sbp_enabled', 'true'::jsonb, 'Предлагать СБП в форме оплаты Тинькофф (если поддерживается терминалом)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('payment_order_provider', 'tinkoff'::jsonb, 'Провайдер оплаты для публикации заказа (секреты всегда в .env)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('payment_pro_provider', 'tinkoff'::jsonb, 'Провайдер оплаты для покупки PRO (секреты всегда в .env)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('payment_pro_purchase_enabled', 'true'::jsonb, 'Разрешить покупку PRO через Тинькофф (страница /pro)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('pro_subscription_price_rub', '990'::jsonb, 'Стоимость продления PRO за один период (₽)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.system_settings (key, value, description, category) VALUES
('pro_subscription_days', '30'::jsonb, 'Длительность одного оплаченного периода PRO (дней)', 'system')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
