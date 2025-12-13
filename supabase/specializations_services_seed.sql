-- Seed 50 specializations and 500 services (10 per specialization)

-- Specializations
INSERT INTO public.specializations (name, slug) VALUES
('Автосервис общий', 'autoservice-common'),
('Двигатель и моторист', 'engine-motor'),
('Трансмиссия и КПП', 'transmission-gearbox'),
('Подвеска и рулевое', 'suspension-steering'),
('Тормозная система', 'brake-system'),
('Автоэлектрика', 'auto-electric'),
('Кузовной ремонт', 'body-repair'),
('Кузовная сварка', 'body-welding'),
('Покраска и малярка', 'painting'),
('Шиномонтаж и балансировка', 'tire-service'),
('Автокондиционеры', 'auto-ac'),
('Газ/GBO', 'lpg-gbo'),
('Детейлинг и полировка', 'detailing'),
('Салон и обшивка', 'interior-trim'),
('Стекла и фары', 'glass-lights'),
('Тюнинг и чип-тюнинг', 'tuning'),
('Мото/квадро сервис', 'moto-service'),
('Коммерческий транспорт', 'commercial-vehicles'),
('Электромобили', 'ev-service'),
('Диагностика и осмотр', 'diagnostics'),
('Общестроительные работы', 'general-construction'),
('Фундамент и бетон', 'foundation-concrete'),
('Кровля и водосток', 'roofing-gutter'),
('Кладка и каменщик', 'masonry'),
('Монолит и армирование', 'monolith'),
('Каркасные дома', 'frame-houses'),
('Деревянные дома', 'wood-houses'),
('Черновая отделка', 'rough-finishing'),
('Чистовая отделка', 'finish-finishing'),
('Плитка и камень', 'tile-stone'),
('Сантехника', 'plumbing'),
('Электромонтаж', 'electrical'),
('Окна и двери', 'windows-doors'),
('Отопление', 'heating'),
('Вентиляция и кондиционирование', 'hvac'),
('Фасадные работы', 'facade'),
('Благоустройство участка', 'landscaping'),
('Заборы и ворота', 'fences-gates'),
('Металлоконструкции и сварка', 'metal-welding'),
('Штукатурка и шпатлевка', 'plaster'),
('Стяжка и наливной пол', 'floor-screed'),
('Гипсокартон и перегородки', 'drywall'),
('Потолки', 'ceilings'),
('Малярные работы', 'painting-walls'),
('Паркет/ламинат', 'flooring'),
('Мебель и сборка', 'furniture-assembly'),
('Клининг', 'cleaning'),
('Грузчики и доставка', 'moving-delivery'),
('Слаботочка и умный дом', 'low-voltage-smart'),
('Видео и сигнализация', 'cctv-security'),
('Проектирование и геодезия', 'design-survey'),
('Демонтаж и алмазное бурение', 'demolition-core'),
('Печи, камины, барбекю', 'stoves-fireplaces'),
('Септики и канализация', 'septic-drain'),
('Водоснабжение и скважины', 'water-supply'),
('Бани и сауны', 'baths-saunas'),
('Бассейны и спа', 'pools-spa'),
('Лестницы и пандусы', 'stairs-ramps');

-- Added specializations
INSERT INTO public.specializations (name, slug) VALUES
('Перевозки и логистика', 'transport-logistics'),
('Спецтехника и аренда', 'heavy-machinery'),
('Разнорабочие и помощь', 'handymen-labor'),
('Проектирование и архитектура', 'design-architecture'),
('Дизайн интерьеров', 'interior-design-pro'),
('Алмазное бурение (узкая)', 'diamond-drilling')
ON CONFLICT (slug) DO NOTHING;

-- Services (10 per specialization)
-- Автосервис общий
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('ТО и регламентное обслуживание', 'maintenance'),
  ('Замена масел и фильтров', 'oil-filters'),
  ('Подготовка к техосмотру', 'inspection-prep'),
  ('Осмотр перед покупкой', 'prebuy-inspection'),
  ('Диагностика ходовой', 'chassis-check'),
  ('Подбор запчастей', 'parts-picking'),
  ('Комплексная диагностика', 'full-diagnostics'),
  ('Экстренный ремонт', 'emergency-repair'),
  ('Выездной автосервис', 'mobile-service'),
  ('Сезонная подготовка', 'season-prep')
) AS v(svc, slug)
WHERE spec.slug = 'autoservice-common';

-- Двигатель и моторист
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Капитальный ремонт двигателя', 'engine-overhaul'),
  ('Замена ГРМ/цепи', 'timing-replacement'),
  ('Ремонт ГБЦ', 'cylinder-head-repair'),
  ('Диагностика компрессии', 'compression-test'),
  ('Замена прокладок/сальников', 'gasket-seals'),
  ('Ремонт поршневой', 'piston-repair'),
  ('Замена турбины', 'turbo-replacement'),
  ('Ремонт топливной системы', 'fuel-system-repair'),
  ('Чистка форсунок', 'injector-clean'),
  ('Регулировка клапанов', 'valve-adjust')
) AS v(svc, slug)
WHERE spec.slug = 'engine-motor';

-- Трансмиссия и КПП
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Ремонт МКПП', 'manual-repair'),
  ('Ремонт АКПП', 'auto-gearbox-repair'),
  ('Замена сцепления', 'clutch-replacement'),
  ('Замена масла КПП', 'gearbox-oil'),
  ('Диагностика коробки', 'gearbox-diagnostics'),
  ('Ремонт раздатки', 'transfer-case'),
  ('Ремонт кардана', 'propshaft'),
  ('Замена ШРУС', 'cv-joint'),
  ('Ремонт дифференциала', 'diff-repair'),
  ('Адаптация АКПП', 'gearbox-adaptation')
) AS v(svc, slug)
WHERE spec.slug = 'transmission-gearbox';

-- Подвеска и рулевое
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Замена амортизаторов', 'shock-replacement'),
  ('Замена рычагов/сайлентблоков', 'arms-bushings'),
  ('Ремонт рулевой рейки', 'steering-rack'),
  ('Сход-развал', 'alignment'),
  ('Замена стоек стабилизатора', 'stabilizer-links'),
  ('Замена рулевых тяг/наконечников', 'tie-rods'),
  ('Диагностика подвески', 'suspension-diagnostics'),
  ('Замена подшипников ступицы', 'hub-bearings'),
  ('Пневмоподвеска ремонт', 'air-suspension'),
  ('Замена пружин', 'springs-replacement')
) AS v(svc, slug)
WHERE spec.slug = 'suspension-steering';

-- Тормозная система
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Замена колодок', 'brake-pads'),
  ('Замена дисков/барабанов', 'brake-discs'),
  ('Ремонт суппортов', 'caliper-repair'),
  ('Прокачка тормозов', 'brake-bleed'),
  ('Замена тормозных шлангов', 'brake-hoses'),
  ('Диагностика ABS/ESP', 'abs-esp'),
  ('Замена главного цилиндра', 'master-cylinder'),
  ('Стояночный тормоз ремонт', 'parking-brake'),
  ('Замена тормозной жидкости', 'brake-fluid'),
  ('Чистка направляющих', 'guide-clean')
) AS v(svc, slug)
WHERE spec.slug = 'brake-system';

-- Автоэлектрика
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Диагностика электрики', 'electric-diagnostics'),
  ('Ремонт проводки', 'wiring-repair'),
  ('Установка сигнализации', 'alarm-install'),
  ('Установка автозапуска', 'remote-start'),
  ('Ремонт генератора/стартерa', 'alternator-starter'),
  ('CAN-шина, блоки управления', 'ecu-repair'),
  ('Установка парктроников', 'parking-sensors'),
  ('Установка камер', 'camera-install'),
  ('Замена аккумулятора', 'battery-replacement'),
  ('Проблемы с зарядкой', 'charging-issues')
) AS v(svc, slug)
WHERE spec.slug = 'auto-electric';

-- Кузовной ремонт
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Рихтовка', 'dent-repair'),
  ('Вытяжка геометрии', 'frame-straighten'),
  ('Замена кузовных панелей', 'panel-replacement'),
  ('Удаление вмятин PDR', 'pdr'),
  ('Антикоррозийная обработка', 'anti-corrosion'),
  ('Шумовиброизоляция', 'sound-deadening'),
  ('Устранение коррозии', 'rust-repair'),
  ('Полная/частичная разборка', 'body-disassembly'),
  ('Локальный ремонт', 'local-body-repair'),
  ('Подгонка зазоров', 'gap-adjust')
) AS v(svc, slug)
WHERE spec.slug = 'body-repair';

-- Кузовная сварка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Сварка порогов', 'sill-weld'),
  ('Сварка лонжеронов', 'frame-weld'),
  ('Сварка днища', 'floor-weld'),
  ('Усиление кузова', 'body-reinforce'),
  ('Замена стаканов', 'strut-weld'),
  ('Аргоновая сварка', 'argon-weld'),
  ('Сварка выхлопа', 'exhaust-weld'),
  ('Сварка алюминия', 'aluminum-weld'),
  ('Площадочные работы', 'patch-weld'),
  ('Сварка креплений', 'mount-weld')
) AS v(svc, slug)
WHERE spec.slug = 'body-welding';

-- Покраска и малярка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Локальная покраска', 'local-paint'),
  ('Покраска элемента', 'panel-paint'),
  ('Покраска целиком', 'full-respray'),
  ('Подбор цвета', 'color-match'),
  ('Покраска пластика', 'plastic-paint'),
  ('Лакокрасочное восстановление', 'paint-restore'),
  ('Покраска дисков', 'wheel-paint'),
  ('Полировка после покраски', 'post-paint-polish'),
  ('Удаление сколов', 'chip-repair'),
  ('Грунт/подготовка', 'primer-prep')
) AS v(svc, slug)
WHERE spec.slug = 'painting';

-- Шиномонтаж и балансировка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Снятие/установка шин', 'tire-mount'),
  ('Балансировка', 'balance'),
  ('Ремонт проколов', 'puncture-repair'),
  ('Правка дисков', 'wheel-straighten'),
  ('Хранение шин', 'tire-storage'),
  ('Переобувка сезонная', 'season-swap'),
  ('Замена вентилей', 'valve-replacement'),
  ('Подкачка/азот', 'nitrogen'),
  ('RunFlat обслуживание', 'runflat'),
  ('Мойка колес', 'wheel-wash')
) AS v(svc, slug)
WHERE spec.slug = 'tire-service';

-- Автокондиционеры
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Диагностика кондиционера', 'ac-diagnostics'),
  ('Заправка фреоном', 'ac-refill'),
  ('Поиск утечек', 'ac-leak'),
  ('Ремонт компрессора', 'ac-compressor'),
  ('Замена радиатора/испарителя', 'ac-radiator'),
  ('Замена трубок/шлангов', 'ac-hoses'),
  ('Чистка и дезинфекция', 'ac-clean'),
  ('Замена осушителя', 'ac-dryer'),
  ('Промывка системы', 'ac-flush'),
  ('Установка климат-контроля', 'climate-install')
) AS v(svc, slug)
WHERE spec.slug = 'auto-ac';

-- Газ/GBO
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Установка ГБО', 'lpg-install'),
  ('Обслуживание ГБО', 'lpg-service'),
  ('Регулировка и калибровка', 'lpg-calibration'),
  ('Замена редуктора', 'lpg-reducer'),
  ('Замена форсунок', 'lpg-injectors'),
  ('ГБО 4 поколения', 'lpg-gen4'),
  ('Диагностика утечек', 'lpg-leak'),
  ('Замена баллона', 'lpg-tank'),
  ('Чистка фильтров', 'lpg-filters'),
  ('Перевод на газ/бензин', 'lpg-switch')
) AS v(svc, slug)
WHERE spec.slug = 'lpg-gbo';

-- Детейлинг и полировка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Детейлинг мойка', 'detailing-wash'),
  ('Полировка кузова', 'body-polish'),
  ('Керамическое покрытие', 'ceramic-coating'),
  ('Химчистка салона', 'interior-clean'),
  ('Полировка фар', 'headlight-polish'),
  ('Защитная пленка PPF', 'ppf'),
  ('Жидкое стекло', 'liquid-glass'),
  ('Детейлинг моторного отсека', 'engine-bay-detail'),
  ('Устранение запахов', 'odor-removal'),
  ('Консервация/расконсервация', 'storage-detail')
) AS v(svc, slug)
WHERE spec.slug = 'detailing';

-- Салон и обшивка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Перетяжка салона', 'interior-retrim'),
  ('Ремонт сидений', 'seat-repair'),
  ('Перетяжка руля', 'steering-wrap'),
  ('Шумка салона', 'interior-sound'),
  ('Замена обивки потолка', 'headliner-replace'),
  ('Установка подогрева сидений', 'seat-heating'),
  ('Установка мультимедиа', 'multimedia-install'),
  ('Ремонт торпедо', 'dashboard-repair'),
  ('Замена ковров', 'carpet-replace'),
  ('Установка подсветки', 'ambient-light')
) AS v(svc, slug)
WHERE spec.slug = 'interior-trim';

-- Стекла и фары
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Замена лобового', 'windshield-replace'),
  ('Замена боковых/задних стекол', 'glass-replace'),
  ('Ремонт сколов/трещин', 'glass-repair'),
  ('Установка фар', 'headlight-install'),
  ('Полировка/реставрация фар', 'headlight-restore'),
  ('Замена ламп', 'lamp-replace'),
  ('Установка линз/bi-led', 'projector-install'),
  ('Регулировка света', 'light-adjust'),
  ('Тонировка стекол', 'tinting'),
  ('Бронирование фар', 'headlight-ppf')
) AS v(svc, slug)
WHERE spec.slug = 'glass-lights';

-- Тюнинг и чип-тюнинг
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Чип-тюнинг', 'chip-tuning'),
  ('Stage 1/2/3', 'stage-tuning'),
  ('Отключение ЕГР/сажевого', 'egr-dpf-off'),
  ('Установка выхлопа', 'exhaust-install'),
  ('Установка впуска', 'intake-install'),
  ('Тюнинг подвески', 'suspension-tuning'),
  ('Установка турбины/суперчарджера', 'forced-induction'),
  ('Тюнинг тормозов', 'brake-upgrade'),
  ('Косметический тюнинг', 'cosmetic-tuning'),
  ('Настройка стенд', 'dyno-tune')
) AS v(svc, slug)
WHERE spec.slug = 'tuning';

-- Мото/квадро сервис
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('ТО мото/квадро', 'moto-maintenance'),
  ('Ремонт двигателя мото', 'moto-engine'),
  ('Ремонт подвески мото', 'moto-suspension'),
  ('Шиномонтаж мото', 'moto-tires'),
  ('Электрика мото', 'moto-electric'),
  ('Ремонт КПП мото', 'moto-gearbox'),
  ('Тюнинг мото', 'moto-tuning'),
  ('Покраска мото', 'moto-paint'),
  ('Установка защиты', 'moto-protection'),
  ('Диагностика', 'moto-diagnostics')
) AS v(svc, slug)
WHERE spec.slug = 'moto-service';

-- Коммерческий транспорт
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Сервис микроавтобусов', 'van-service'),
  ('Сервис грузовиков', 'truck-service'),
  ('Ремонт ходовой груз', 'truck-suspension'),
  ('Ремонт тормозов груз', 'truck-brakes'),
  ('Ремонт пневмы', 'truck-air'),
  ('Ремонт КПП груз', 'truck-gearbox'),
  ('Ремонт двигателя груз', 'truck-engine'),
  ('Тахографы', 'tachograph'),
  ('Рефрижераторы', 'refrigerator'),
  ('Диагностика груз', 'truck-diagnostics')
) AS v(svc, slug)
WHERE spec.slug = 'commercial-vehicles';

-- Электромобили
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Диагностика ВВБ', 'hv-battery-diagnostics'),
  ('Ремонт ВВБ', 'hv-battery-repair'),
  ('Замена модулей батареи', 'hv-module-replace'),
  ('Охлаждение батареи', 'hv-cooling'),
  ('Ремонт инвертора', 'inverter-repair'),
  ('Ремонт зарядки OBC', 'obc-repair'),
  ('Силовая электроника', 'power-electronics'),
  ('Проверка изоляции', 'isolation-check'),
  ('Установка ЗУ/портов', 'charge-port-install'),
  ('Обслуживание гибридов', 'hybrid-service')
) AS v(svc, slug)
WHERE spec.slug = 'ev-service';

-- Диагностика и осмотр
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Компьютерная диагностика', 'computer-diagnostics'),
  ('Чтение/сброс ошибок', 'dtc-read'),
  ('Диагностика перед покупкой', 'prebuy-check'),
  ('Эндоскопия двигателя', 'engine-scope'),
  ('Проверка лакокраски', 'paint-meter'),
  ('Диагностика АКПП', 'at-diagnostics'),
  ('Диагностика подвески', 'suspension-check'),
  ('Тест-драйв', 'test-drive'),
  ('Скан ABS/ESP', 'abs-scan'),
  ('Отчет по автомобилю', 'car-report')
) AS v(svc, slug)
WHERE spec.slug = 'diagnostics';

-- Общестроительные работы
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Генподряд', 'general-contract'),
  ('Комплексный ремонт', 'full-renovation'),
  ('Строительство под ключ', 'turnkey-build'),
  ('Авторский надзор', 'site-supervision'),
  ('Смета и бюджет', 'estimate'),
  ('Технический надзор', 'tech-supervision'),
  ('Материалы и логистика', 'materials-logistics'),
  ('Управление бригадой', 'crew-management'),
  ('Приемка работ', 'works-acceptance'),
  ('Расчистка участка', 'site-clearing')
) AS v(svc, slug)
WHERE spec.slug = 'general-construction';

-- Фундамент и бетон
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Ленточный фундамент', 'strip-foundation'),
  ('Плита фундаментная', 'slab-foundation'),
  ('Свайно-ростверк', 'pile-foundation'),
  ('Монолитные работы', 'monolith-works'),
  ('Устройство опалубки', 'formwork'),
  ('Армирование', 'reinforcement'),
  ('Бетонирование', 'concreting'),
  ('Гидроизоляция фундамента', 'foundation-waterproof'),
  ('Дренаж вокруг дома', 'foundation-drainage'),
  ('Теплоизоляция фундамента', 'foundation-insulation')
) AS v(svc, slug)
WHERE spec.slug = 'foundation-concrete';

-- Кровля и водосток
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Монтаж мягкой кровли', 'soft-roof'),
  ('Монтаж металлочерепицы', 'metal-roof'),
  ('Плоская кровля', 'flat-roof'),
  ('Ремонт кровли', 'roof-repair'),
  ('Утепление кровли', 'roof-insulation'),
  ('Монтаж водостоков', 'gutter-install'),
  ('Снегозадержатели', 'snow-guards'),
  ('Пароизоляция', 'vapor-barrier'),
  ('Обработка примыканий', 'roof-flashing'),
  ('Монтаж мансардных окон', 'roof-windows')
) AS v(svc, slug)
WHERE spec.slug = 'roofing-gutter';

-- Кладка и каменщик
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Кладка кирпича', 'brickwork'),
  ('Кладка блока (газоблок)', 'blockwork'),
  ('Облицовка кирпичом', 'brick-facing'),
  ('Арки и перемычки', 'arches'),
  ('Дымоходы', 'chimneys'),
  ('Кладка перегородок', 'partition-brick'),
  ('Декоративная кладка', 'decor-brick'),
  ('Расшивка швов', 'jointing'),
  ('Восстановление кладки', 'masonry-restore'),
  ('Кирпичные вентканалы', 'vent-brick')
) AS v(svc, slug)
WHERE spec.slug = 'masonry';

-- Монолит и армирование
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Монолитные стены', 'monolith-walls'),
  ('Монолитные перекрытия', 'monolith-slabs'),
  ('Лестницы монолит', 'monolith-stairs'),
  ('Опалубка и вязка', 'form-rebar'),
  ('Колонны и ригели', 'columns-beams'),
  ('Пояса и обвязка', 'belt-rebar'),
  ('Усиление проемов', 'opening-reinforce'),
  ('Монолитные ростверки', 'monolith-rostverk'),
  ('Анкеровка', 'anchoring'),
  ('Контроль бетона', 'concrete-control')
) AS v(svc, slug)
WHERE spec.slug = 'monolith';

-- Каркасные дома
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Каркас под ключ', 'frame-turnkey'),
  ('Сборка каркаса', 'frame-assembly'),
  ('Утепление каркаса', 'frame-insulation'),
  ('Паро-/ветрозащита', 'frame-membrane'),
  ('Обшивка ОСБ/СИП', 'osb-sip'),
  ('Монтаж перекрытий', 'frame-floors'),
  ('Кровля для каркаса', 'frame-roof'),
  ('Фасад каркасного дома', 'frame-facade'),
  ('Инженерка в каркасе', 'frame-mep'),
  ('Отделка каркасного дома', 'frame-finishing')
) AS v(svc, slug)
WHERE spec.slug = 'frame-houses';

-- Деревянные дома
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Сруб под ключ', 'log-house'),
  ('Сборка бруса/бревна', 'timber-assembly'),
  ('Конопатка', 'caulking'),
  ('Шлифовка дерева', 'wood-sanding'),
  ('Антисептирование', 'wood-antiseptic'),
  ('Утепление межвенц', 'inter-log-insulation'),
  ('Фасад дерева', 'wood-facade'),
  ('Замена венцов', 'log-replacement'),
  ('Кровля деревянного дома', 'wood-roof'),
  ('Инженерка в дереве', 'wood-mep')
) AS v(svc, slug)
WHERE spec.slug = 'wood-houses';

-- Черновая отделка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Штукатурка по маякам', 'plaster-beacons'),
  ('Выравнивание стен', 'wall-leveling'),
  ('Стяжка пола', 'floor-screed-service'),
  ('Прокладка коммуникаций', 'rough-mep'),
  ('Звукоизоляция', 'soundproofing'),
  ('Гидроизоляция санузлов', 'wetroom-waterproof'),
  ('Черновая электрика', 'rough-electrics'),
  ('Черновая сантехника', 'rough-plumbing'),
  ('Грунтовка', 'primer'),
  ('Черновой потолок', 'rough-ceiling')
) AS v(svc, slug)
WHERE spec.slug = 'rough-finishing';

-- Чистовая отделка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Поклейка обоев', 'wallpaper'),
  ('Покраска стен', 'wall-paint'),
  ('Декоративные покрытия', 'decor-finishes'),
  ('Монтаж плинтусов', 'baseboards'),
  ('Дверные наличники', 'door-casings'),
  ('Укладка напольных покрытий', 'floor-coverings'),
  ('Монтаж розеток/выключателей', 'outlets-switches'),
  ('Установка дверей', 'interior-doors'),
  ('Финиш потолков', 'finish-ceilings'),
  ('Стыковка материалов', 'finish-joins')
) AS v(svc, slug)
WHERE spec.slug = 'finish-finishing';

-- Плитка и камень
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Укладка плитки', 'tile-install'),
  ('Плитка в санузле', 'bathroom-tile'),
  ('Керамогранит', 'porcelain-tile'),
  ('Мозаика', 'mosaic'),
  ('Натуральный камень', 'natural-stone'),
  ('Стыковка/запил 45°', 'mitre'),
  ('Гидроизоляция под плитку', 'tile-waterproof'),
  ('Теплый пол под плитку', 'tile-floor-heat'),
  ('Ремонт швов/затирки', 'grout-repair'),
  ('Подиумы и ниши', 'tile-niche')
) AS v(svc, slug)
WHERE spec.slug = 'tile-stone';

-- Сантехника
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Разводка водоснабжения', 'water-supply-layout'),
  ('Разводка канализации', 'sewer-layout'),
  ('Установка сантехприборов', 'fixtures-install'),
  ('Инсталляции и унитазы', 'toilet-install'),
  ('Смесители и души', 'faucets-showers'),
  ('Ванны и поддоны', 'bathtubs-trays'),
  ('Фильтры и умягчение', 'water-filters'),
  ('Реконструкция стояков', 'riser-replace'),
  ('Теплый пол водяной', 'hydronic-floor'),
  ('Герметизация санузлов', 'bathroom-seal')
) AS v(svc, slug)
WHERE spec.slug = 'plumbing';

-- Электромонтаж
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Проект электрики', 'electro-project'),
  ('Щит и автоматика', 'panel-setup'),
  ('Прокладка кабеля', 'cable-laying'),
  ('Розетки/выключатели', 'sockets'),
  ('Освещение и светильники', 'lighting'),
  ('Слаботочка', 'low-current'),
  ('Заземление/УЗО', 'grounding-rcd'),
  ('Теплый пол электрический', 'electric-floor'),
  ('Умный дом базовый', 'smart-home-basic'),
  ('Аварийный выезд электрика', 'electric-emergency')
) AS v(svc, slug)
WHERE spec.slug = 'electrical';

-- Окна и двери
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Монтаж ПВХ окон', 'pvc-windows'),
  ('Алюминиевые конструкции', 'aluminum-windows'),
  ('Деревянные окна', 'wood-windows'),
  ('Монтаж входных дверей', 'entry-doors'),
  ('Монтаж межкомнатных дверей', 'interior-doors-install'),
  ('Регулировка окон/дверей', 'window-adjust'),
  ('Замена фурнитуры', 'hardware-replace'),
  ('Откосы и подоконники', 'slopes-sills'),
  ('Москитные сетки', 'mosquito-nets'),
  ('Панорамное остекление', 'panoramic-glazing')
) AS v(svc, slug)
WHERE spec.slug = 'windows-doors';

-- Отопление
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Проект отопления', 'heating-project'),
  ('Монтаж радиаторов', 'radiators'),
  ('Котлы и обвязка', 'boilers'),
  ('Теплый пол водяной', 'hydro-floor-heat'),
  ('Коллекторы и балансировка', 'manifold-balance'),
  ('Тепловые насосы', 'heat-pumps'),
  ('Автоматика отопления', 'heating-automation'),
  ('Пусконаладка системы', 'heating-commission'),
  ('Сервис котельной', 'boiler-service'),
  ('Замена труб отопления', 'heating-pipes')
) AS v(svc, slug)
WHERE spec.slug = 'heating';

-- Вентиляция и кондиционирование
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Проект вентиляции', 'vent-project'),
  ('Приточно-вытяжная система', 'supply-exhaust'),
  ('Канальные системы', 'ducted-systems'),
  ('Монтаж сплит-систем', 'split-install'),
  ('Сервис кондиционеров', 'ac-service'),
  ('Монтаж воздуховодов', 'duct-install'),
  ('Балансировка воздуха', 'air-balance'),
  ('Рекуперация', 'recuperation'),
  ('Увлажнение/осушение', 'humid-dry'),
  ('Чистка вентиляции', 'vent-clean')
) AS v(svc, slug)
WHERE spec.slug = 'hvac';

-- Фасадные работы
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Мокрый фасад', 'wet-facade'),
  ('Вентилируемый фасад', 'vent-facade'),
  ('Сайдинг', 'siding'),
  ('Декоративная штукатурка', 'decor-plaster'),
  ('Утепление фасада', 'facade-insulation'),
  ('Отливы, откосы', 'facade-slopes'),
  ('Облицовка камнем/кирпичом', 'facade-stone'),
  ('Фасадные панели', 'facade-panels'),
  ('Ремонт фасада', 'facade-repair'),
  ('Очистка и покраска фасада', 'facade-paint')
) AS v(svc, slug)
WHERE spec.slug = 'facade';

-- Благоустройство участка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Планировка участка', 'site-grading'),
  ('Дренаж и ливневка', 'drainage-storm'),
  ('Отмостка', 'blind-area'),
  ('Тротуарная плитка', 'paving'),
  ('Газон и озеленение', 'lawn'),
  ('Автополив', 'irrigation'),
  ('Подпорные стены', 'retaining-walls'),
  ('Габионы', 'gabions'),
  ('Подсветка участка', 'yard-light'),
  ('Мощение натуральным камнем', 'stone-paving')
) AS v(svc, slug)
WHERE spec.slug = 'landscaping';

-- Заборы и ворота
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Забор из профлиста', 'fence-proflist'),
  ('Забор из дерева', 'fence-wood'),
  ('Сетки-рабицы', 'fence-mesh'),
  ('Бетонные/блочные столбы', 'fence-posts'),
  ('Автоматические ворота', 'gates-automatic'),
  ('Откатные ворота', 'gates-sliding'),
  ('Распашные ворота', 'gates-swing'),
  ('Калитки и замки', 'wicket-locks'),
  ('Секционные ворота', 'sectional-gates'),
  ('Ковка и решетки', 'forging-grates')
) AS v(svc, slug)
WHERE spec.slug = 'fences-gates';

-- Металлоконструкции и сварка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Изготовление каркасов', 'metal-frames'),
  ('Навесы и козырьки', 'canopies'),
  ('Лестницы металлические', 'metal-stairs'),
  ('Сварка ворот/заборов', 'weld-gates'),
  ('Металлические двери', 'metal-doors'),
  ('Сварка балконов', 'balcony-weld'),
  ('Ремонт металлоконструкций', 'metal-repair'),
  ('Аргон/нерж сварка', 'argon-weld-metal'),
  ('Порошковая покраска', 'powder-coat'),
  ('Проект металлоконструкций', 'metal-design')
) AS v(svc, slug)
WHERE spec.slug = 'metal-welding';

-- Штукатурка и шпатлевка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Машинная штукатурка', 'machine-plaster'),
  ('Ручная штукатурка', 'hand-plaster'),
  ('Шпатлевка под покраску', 'putty-paint'),
  ('Шпатлевка под обои', 'putty-wallpaper'),
  ('Углы и откосы', 'plaster-corners'),
  ('Маяки и уровень', 'plaster-level'),
  ('Декор штукатурка', 'decor-plaster-works'),
  ('Грунтовка/сетки', 'primer-mesh'),
  ('Ремонт стен', 'wall-repair'),
  ('Контроль ровности', 'flatness-check')
) AS v(svc, slug)
WHERE spec.slug = 'plaster';

-- Стяжка и наливной пол
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Полусухая стяжка', 'semi-dry-screed'),
  ('Мокрая стяжка', 'wet-screed'),
  ('Наливной пол', 'self-leveling'),
  ('Армирование стяжки', 'screed-rebar'),
  ('Демпфер и швы', 'expansion-joints'),
  ('Теплый пол в стяжке', 'screed-floor-heat'),
  ('Гидроизоляция пола', 'floor-waterproof'),
  ('Контроль высот', 'height-control'),
  ('Фиброволокно', 'fiber'),
  ('Шлифовка стяжки', 'screed-grind')
) AS v(svc, slug)
WHERE spec.slug = 'floor-screed';

-- Гипсокартон и перегородки
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Перегородки ГКЛ', 'gkl-partitions'),
  ('Короба и ниши', 'gkl-boxes'),
  ('Многоуровневые потолки', 'gkl-ceilings'),
  ('Звукоизоляция ГКЛ', 'gkl-sound'),
  ('Арки из ГКЛ', 'gkl-arches'),
  ('Шпаклевка стыков', 'gkl-putty'),
  ('Крепеж и профили', 'gkl-profiles'),
  ('Инженерка в ГКЛ', 'gkl-mep'),
  ('Подвесные системы', 'gkl-systems'),
  ('Ревизионные люки', 'gkl-hatches')
) AS v(svc, slug)
WHERE spec.slug = 'drywall';

-- Потолки
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Натяжные потолки', 'stretch-ceiling'),
  ('Подвесные потолки', 'suspended-ceiling'),
  ('Реечные потолки', 'rack-ceiling'),
  ('Потолок ГКЛ', 'gkl-ceiling'),
  ('Интеграция света', 'ceiling-light'),
  ('Парящие потолки', 'floating-ceiling'),
  ('Шумоизоляция потолка', 'ceiling-sound'),
  ('Выравнивание потолка', 'ceiling-level'),
  ('Потолочные карнизы', 'ceiling-cornice'),
  ('Ремонт потолка', 'ceiling-repair')
) AS v(svc, slug)
WHERE spec.slug = 'ceilings';

-- Малярные работы
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Окраска стен', 'paint-walls'),
  ('Окраска потолков', 'paint-ceiling'),
  ('Декоративные краски', 'decor-paint'),
  ('Подготовка под окраску', 'prep-paint'),
  ('Колеровка', 'tinting'),
  ('Покраска металла', 'paint-metal'),
  ('Покраска дерева', 'paint-wood'),
  ('Покраска фасада', 'paint-facade'),
  ('Шлифовка/шкурка', 'sanding'),
  ('Малярный инструмент', 'paint-tools')
) AS v(svc, slug)
WHERE spec.slug = 'painting-walls';

-- Паркет/ламинат
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Укладка ламината', 'laminate-install'),
  ('Укладка паркета', 'parquet-install'),
  ('Инженерная доска', 'engineered-wood'),
  ('Пробковое покрытие', 'cork-floor'),
  ('Шлифовка и циклевка', 'parquet-sanding'),
  ('Лак/масло нанесение', 'parquet-finish'),
  ('Подложка и подготовка', 'underlayment'),
  ('Плинтус и порожки', 'floor-trims'),
  ('Ремонт пола', 'floor-repair'),
  ('Теплый пол совместимость', 'floor-heat-compat')
) AS v(svc, slug)
WHERE spec.slug = 'flooring';

-- Мебель и сборка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Сборка корпусной мебели', 'furniture-assembly'),
  ('Кухни под ключ', 'kitchen-install'),
  ('Встроенные шкафы', 'built-in-closet'),
  ('Раздвижные системы', 'sliding-systems'),
  ('Установка фурнитуры', 'furniture-hardware'),
  ('Мебель на заказ', 'custom-furniture'),
  ('Ремонт мебели', 'furniture-repair'),
  ('Монтаж столешниц', 'countertops'),
  ('Установка сантехники кухни', 'kitchen-plumbing'),
  ('Подсветка мебели', 'furniture-light')
) AS v(svc, slug)
WHERE spec.slug = 'furniture-assembly';

-- Клининг
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Генеральная уборка', 'deep-clean'),
  ('Уборка после ремонта', 'post-renovation-clean'),
  ('Ежедневная уборка', 'regular-clean'),
  ('Мытье окон', 'window-clean'),
  ('Химчистка мебели', 'furniture-clean'),
  ('Химчистка ковров', 'carpet-clean'),
  ('Антисептическая обработка', 'disinfection'),
  ('Уборка офисов', 'office-clean'),
  ('Уборка домов', 'house-clean'),
  ('Уборка подъездов', 'entrance-clean')
) AS v(svc, slug)
WHERE spec.slug = 'cleaning';

-- Грузчики и доставка
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Переезд под ключ', 'moving'),
  ('Грузчики почасово', 'loaders-hourly'),
  ('Такелаж тяжелого', 'rigging'),
  ('Разбор/сборка мебели', 'move-furniture'),
  ('Упаковка вещей', 'packing'),
  ('Доставка стройматериалов', 'materials-delivery'),
  ('Вывоз мусора', 'trash-removal'),
  ('Подъем на этаж', 'floor-lift'),
  ('Мини-грузоперевозки', 'mini-freight'),
  ('Перевозка техники', 'appliance-transport')
) AS v(svc, slug)
WHERE spec.slug = 'moving-delivery';

-- Слаботочка и умный дом
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Wi-Fi и сеть', 'wifi-network'),
  ('СКС и патч-панели', 'structured-cabling'),
  ('Умный свет', 'smart-light'),
  ('Управление климатом', 'smart-climate'),
  ('Датчики протечки/дыма', 'smart-sensors'),
  ('Голосовые ассистенты', 'voice-assist'),
  ('Шторы/карнизы умные', 'smart-curtains'),
  ('Мультирум', 'multiroom'),
  ('Серверная/стойка', 'rack-setup'),
  ('Удаленный доступ', 'remote-access')
) AS v(svc, slug)
WHERE spec.slug = 'low-voltage-smart';

-- Видео и сигнализация
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Видеонаблюдение', 'cctv'),
  ('IP камеры настройка', 'ip-cameras'),
  ('Сигнализация дом/офис', 'alarm-system'),
  ('СКУД/домофоны', 'access-control'),
  ('Видеодомофоны', 'video-intercom'),
  ('Удаленный мониторинг', 'remote-monitor'),
  ('Облачное хранение', 'cloud-storage'),
  ('Аварийная кнопка', 'panic-button'),
  ('Сенсоры периметра', 'perimeter-sensors'),
  ('Пожарная сигнализация', 'fire-alarm')
) AS v(svc, slug)
WHERE spec.slug = 'cctv-security';

-- Проектирование и геодезия
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('АР/КР проекты', 'arch-struct'),
  ('ГП и генплан', 'master-plan'),
  ('Инженерные сети проекты', 'mep-project'),
  ('3D визуализация', '3d-visual'),
  ('Интерьерный дизайн', 'interior-design'),
  ('Геодезическая съемка', 'survey'),
  ('Разбивка осей', 'axes-layout'),
  ('Исполнительная съемка', 'as-built'),
  ('Топосъемка', 'topography'),
  ('Согласования', 'permits')
) AS v(svc, slug)
WHERE spec.slug = 'design-survey';

-- Демонтаж и алмазное бурение
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Демонтаж стен/перегородок', 'wall-demolition'),
  ('Демонтаж полов/плитки', 'floor-demolition'),
  ('Алмазное бурение', 'core-drilling'),
  ('Алмазная резка', 'diamond-cut'),
  ('Вывоз строительного мусора', 'construction-waste'),
  ('Усиление проемов', 'opening-reinforce-demo'),
  ('Пылеулавливание', 'dust-control'),
  ('Демонтаж сантехники', 'plumbing-demolition'),
  ('Демонтаж электрики', 'electric-demolition'),
  ('Снос малых построек', 'small-demolition')
) AS v(svc, slug)
WHERE spec.slug = 'demolition-core';

-- Печи, камины, барбекю
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Кладка печей', 'stove-build'),
  ('Кладка каминов', 'fireplace-build'),
  ('Барбекю и мангальные зоны', 'bbq-zone'),
  ('Дымоходы печные', 'stove-chimney'),
  ('Облицовка печей', 'stove-facing'),
  ('Топки и кассеты', 'fireplace-insert'),
  ('Ремонт печей/каминов', 'stove-repair'),
  ('Чистка дымоходов', 'chimney-clean'),
  ('Монтаж притока', 'stove-air'),
  ('Автоматика дымососы', 'chimney-fan')
) AS v(svc, slug)
WHERE spec.slug = 'stoves-fireplaces';

-- Септики и канализация
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Монтаж септика', 'septic-install'),
  ('ЛОС и аэрация', 'wastewater-treatment'),
  ('Дренажные поля', 'drain-fields'),
  ('Колодцы и ревизии', 'inspection-wells'),
  ('Канализация в доме', 'indoor-sewer'),
  ('Канализация наружная', 'outdoor-sewer'),
  ('Обслуживание септика', 'septic-service'),
  ('Откачка/чистка', 'septic-clean'),
  ('Утепление трассы', 'sewer-insulation'),
  ('Ремонт канализации', 'sewer-repair')
) AS v(svc, slug)
WHERE spec.slug = 'septic-drain';

-- Водоснабжение и скважины
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Бурение скважин', 'well-drilling'),
  ('Кессоны и оголовки', 'wellhead'),
  ('Насосные станции', 'pump-station'),
  ('Гидроаккумуляторы', 'hydro-accumulator'),
  ('Водоподготовка', 'water-treatment'),
  ('Разводка воды в доме', 'indoor-water'),
  ('Утепление трасс', 'water-insulation'),
  ('Анализ воды', 'water-test'),
  ('Сервис насосов', 'pump-service'),
  ('Консервация скважин', 'well-conservation')
) AS v(svc, slug)
WHERE spec.slug = 'water-supply';

-- Бани и сауны
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Строительство бани', 'bath-build'),
  ('Сауны под ключ', 'sauna-turnkey'),
  ('Парные и печи', 'steam-stoves'),
  ('Отделка вагонкой', 'sauna-lining'),
  ('Гидро/паробарьер', 'sauna-membrane'),
  ('Подиумы и лежаки', 'sauna-benches'),
  ('Освещение в бане', 'sauna-light'),
  ('Автоматика печей', 'sauna-automation'),
  ('Вентиляция бани', 'sauna-vent'),
  ('Сервис печей', 'sauna-stove-service')
) AS v(svc, slug)
WHERE spec.slug = 'baths-saunas';

-- Бассейны и спа
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Бетонные бассейны', 'concrete-pools'),
  ('Каркасные/композитные', 'frame-pools'),
  ('Гидроизоляция чаши', 'pool-waterproof'),
  ('Оборудование и фильтры', 'pool-equipment'),
  ('Химия и обслуживание', 'pool-chemistry'),
  ('Подогрев воды', 'pool-heating'),
  ('Накрытия и павильоны', 'pool-covers'),
  ('Скиммер/перелив', 'pool-skimmer'),
  ('SPA и джакузи', 'spa-install'),
  ('Консервация/расконсервация', 'pool-conservation')
) AS v(svc, slug)
WHERE spec.slug = 'pools-spa';

-- Лестницы и пандусы
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Деревянные лестницы', 'wood-stairs'),
  ('Металлические лестницы', 'metal-stairs-service'),
  ('Монолитные лестницы', 'monolith-stairs-service'),
  ('Отделка ступеней', 'stairs-finishing'),
  ('Ограждения и перила', 'railings'),
  ('Пандусы и подъемники', 'ramps-lifts'),
  ('Лестницы на тетивах/косоурах', 'stringer-stairs'),
  ('Сборные лестницы', 'modular-stairs'),
  ('Антискользящее покрытие', 'anti-slip'),
  ('Подсветка лестниц', 'stairs-light')
) AS v(svc, slug)
WHERE spec.slug = 'stairs-ramps';

-- Перевозки и логистика
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Грузовые перевозки по городу', 'city-freight'),
  ('Межгород перевозки', 'intercity-freight'),
  ('Попутные грузы', 'partial-load'),
  ('Перевозка негабарита', 'oversize'),
  ('Перевозка стройматериалов', 'construction-freight'),
  ('Перевозка техники', 'equipment-transport'),
  ('Холодильные перевозки', 'refrigerated'),
  ('Экспедирование и страховка', 'expedition-insurance'),
  ('Такелаж тяжёлого', 'rigging-heavy'),
  ('Сборные грузы', 'consolidated-cargo')
) AS v(svc, slug)
WHERE spec.slug = 'transport-logistics';

-- Спецтехника и аренда
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Аренда экскаватора', 'rent-excavator'),
  ('Аренда погрузчика', 'rent-loader'),
  ('Манипулятор', 'rent-manipulator'),
  ('Автокран', 'rent-crane'),
  ('Ямобур', 'rent-drill'),
  ('Каток', 'rent-roller'),
  ('Бульдозер', 'rent-bulldozer'),
  ('Самосвал', 'rent-dumptruck'),
  ('Мини-погрузчик/мини-экскаватор', 'rent-mini'),
  ('Доставка спецтехники', 'equipment-delivery')
) AS v(svc, slug)
WHERE spec.slug = 'heavy-machinery';

-- Разнорабочие и помощь
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Подсобные работы', 'general-labor'),
  ('Погрузка/разгрузка', 'loading'),
  ('Копка траншей/котлованов', 'digging'),
  ('Уборка стройплощадки', 'site-cleanup'),
  ('Разборка/демонтаж легкий', 'light-demolition'),
  ('Подача материалов', 'materials-supply'),
  ('Разводка/перемещение по этажам', 'materials-floor'),
  ('Грунтовка/подготовка', 'priming'),
  ('Штробление под кабель/трубу', 'chasing'),
  ('Вынос мусора', 'waste-carry')
) AS v(svc, slug)
WHERE spec.slug = 'handymen-labor';

-- Проектирование и архитектура (дополнение)
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Концепция и планировки', 'layouts'),
  ('Рабочая документация', 'working-docs'),
  ('Расчёт конструкций', 'structural-calc'),
  ('Инженерные разделы', 'mep-sections'),
  ('Авторский надзор', 'author-supervision'),
  ('Паспорт отделочных материалов', 'finishes-spec'),
  ('Энергомодель/теплотехника', 'energy-model'),
  ('Свод смет и бюджет', 'budget-compile'),
  ('Техусловия и согласования', 'permits-approvals'),
  ('BIM-модель', 'bim-model')
) AS v(svc, slug)
WHERE spec.slug = 'design-architecture';

-- Дизайн интерьеров (отдельно)
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Концепт и ТЗ', 'concept'),
  ('Планировочные решения', 'planning'),
  ('3D визуализация', '3d-visual-interior'),
  ('Подбор отделки и мебели', 'finishes-furniture'),
  ('Чертежи для ремонта', 'interior-drawings'),
  ('Спецификация освещения', 'lighting-spec'),
  ('Спецификация электрики', 'power-spec'),
  ('Ведомость мебели/декора', 'furniture-spec'),
  ('Авторский надзор интерьера', 'interior-supervision'),
  ('Комплектация и закупки', 'procurement')
) AS v(svc, slug)
WHERE spec.slug = 'interior-design-pro';

-- Алмазное бурение (узкая)
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.svc, v.slug FROM public.specializations spec CROSS JOIN LATERAL (
  VALUES
  ('Алмазное бурение под канализацию', 'diamond-drain'),
  ('Отверстия под кондиционер', 'diamond-ac'),
  ('Отверстия под вентиляцию', 'diamond-vent'),
  ('Проемы в стенах/перекрытиях', 'diamond-openings'),
  ('Сверление под анкера/закладные', 'diamond-anchors'),
  ('Резка проемов', 'diamond-cut-openings'),
  ('Сухое бурение', 'diamond-dry'),
  ('Мокрое бурение', 'diamond-wet'),
  ('Бурение с пылеотводом', 'diamond-dust'),
  ('Сложный доступ/канаты', 'diamond-access')
) AS v(svc, slug)
WHERE spec.slug = 'diamond-drilling';


