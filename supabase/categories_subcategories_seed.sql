-- ============================================
-- ЭТАП 2 ПЛАНА: Сид данных — категории, подкатегории, услуги
-- ============================================
-- 21 категории + подкатегории + услуги (3 уровня). Без «Склад и хранение», «Аренда инструмента».
-- Выполни в Supabase SQL Editor после categories_subcategories_schema.sql (этап 1).
-- Категории: ON CONFLICT (slug) DO NOTHING — можно запускать повторно, дубликаты не создадутся.
-- ============================================

-- Категории (slug для API и фильтров)
INSERT INTO public.categories (name, slug, sort_order) VALUES
('Строительные мастера', 'stroika', 1),
('Отделка и ремонт', 'otdelka-remont', 2),
('Автосервис', 'autoservice', 3),
('Грузоперевозки', 'gruzoperevozki', 4),
('Спецтехника', 'spectehnika', 5),
('Благоустройство', 'blagoustrojstvo', 6),
('Художественная ковка', 'hudozhestvennaya-kovka', 7),
('Пром-альпинизм', 'prom-alpinizm', 8),
('Откачка и очистка канализации', 'otkachka-kanalizacii', 9),
('Водоснабжение и привоз воды', 'vodosnabzhenie', 10),
('Клининг', 'klining', 11),
('Мастер на час', 'master-na-chas', 12),
('Охрана и безопасность', 'ohrana-bezopasnost', 13),
('Вывоз мусора', 'vyvoz-musora', 14),
('Грузчики', 'gruzchiki', 15),
('Разнорабочие', 'raznorabochye', 16),
('Автоподбор', 'avtopodbor', 17),
('Автоперевозки', 'avtoperevozki', 18),
('Ремонт техники', 'remont-tehniki', 19),
('Дизайн и проектирование', 'dizajn-proektirovanie', 20),
('Работы со спецоборудованием', 'specoborudovanie', 21)
ON CONFLICT (slug) DO NOTHING;

-- Подкатегории и услуги: Строительные мастера
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Фундаментные работы', 'fundament', 1 FROM public.categories c WHERE c.slug = 'stroika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'fundament'
CROSS JOIN LATERAL (VALUES ('Ленточный фундамент','lentochnyj',1),('Плита','plita',2),('Свайно-ростверк','svajno-rostverk',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Кладка кирпича', 'kladka-kirpicha', 2 FROM public.categories c WHERE c.slug = 'stroika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'kladka-kirpicha'
CROSS JOIN LATERAL (VALUES ('Кладка стен','steny',1),('Облицовка','oblitsovka',2),('Арки и перемычки','arki',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Кладка блока', 'kladka-bloka', 3 FROM public.categories c WHERE c.slug = 'stroika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'kladka-bloka'
CROSS JOIN LATERAL (VALUES ('Газоблок','gazoblock',1),('Пеноблок','penoblock',2),('Керамзитоблок','keramzit',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Кровельные работы', 'krovelnye-raboty', 4 FROM public.categories c WHERE c.slug = 'stroika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'krovelnye-raboty'
CROSS JOIN LATERAL (VALUES ('Монтаж/демонтаж кровли','montazh-demontazh-krovli',1),('Мягкая кровля','myagkaya-krovlya',2),('Водосточная система','vodostochnaya-sistema',3),('Карнизные работы','karniznye-raboty',4),('Металлочерепица','metallocherepitsa',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Лестницы (бетонные, между этажами)', 'lestnitsy-beton', 5 FROM public.categories c WHERE c.slug = 'stroika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'lestnitsy-beton'
CROSS JOIN LATERAL (VALUES ('Бетонные лестницы в доме','betonnye-lestnitsy',1),('Лестницы между этажами','lestnitsy-mezhdu-etazhami',2),('Опалубка и заливка лестниц','opalubka-lestnitsy',3),('Отделка ступеней','otdelka-stupenej',4),('Ограждения и перила','ograzhdeniya-perila',5),('Маршевые лестницы','marshevye',6),('Винтовые лестницы','vintovye',7),('Лестницы на косоурах','na-kosourah',8)) AS v(n,sl,ord);

-- Отделка и ремонт
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Штукатурка и шпаклёвка', 'shtukaturka', 1 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'shtukaturka'
CROSS JOIN LATERAL (VALUES ('По маякам','po-mayakam',1),('Декоративная штукатурка','dekor',2)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Плитка и камень', 'plitka-kamen', 2 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'plitka-kamen'
CROSS JOIN LATERAL (VALUES ('Укладка плитки','ukladka-plitki',1),('Керамогранит','keramogranit',2),('Мозаика','mozaika',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Кладка (плитка, кафель, камень)', 'kladka', 3 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'kladka'
CROSS JOIN LATERAL (VALUES ('Кладка кафеля на стену','kladka-kafelya-stena',1),('Кладка кафеля на пол','kladka-kafelya-pol',2),('Кладка керамогранита','kladka-keramogranit',3),('Кладка мозаики','kladka-mozaika',4),('Декоративный камень в интерьере','dekorativnyj-kamen',5),('Затирка швов','zatirka-shvov',6),('Тёплый пол под плитку','teplyj-pol-pod-plitku',7),('Ремонт и замена плитки','remont-zamena-plitki',8)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Сантехника', 'santehnika', 4 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'santehnika'
CROSS JOIN LATERAL (VALUES ('Разводка водоснабжения','razvodka-vody',1),('Установка сантехприборов','ustanovka-santehpriborov',2),('Канализация','kanalizaciya',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Электромонтаж', 'elektromontazh', 5 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'elektromontazh'
CROSS JOIN LATERAL (VALUES ('Прокладка кабеля','prokladka-kabelya',1),('Щит и автоматика','shit-avtomatika',2),('Освещение','osveshchenie',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Окна и двери', 'okna-dveri', 6 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'okna-dveri'
CROSS JOIN LATERAL (VALUES ('Монтаж ПВХ окон','montazh-pvh-okon',1),('Монтаж входных дверей','montazh-vhodnyh-dverej',2),('Межкомнатные двери','mezhkomnatnye-dveri',3),('Остекление балконов и лоджий','osteklenie-balkonov',4),('Регулировка и ремонт фурнитуры','regulirovka-furnitury',5),('Замена стеклопакетов','zamen-steklopaketov',6),('Панорамное остекление','panoramnoe-osteklenie',7),('Москитные сетки','moskitnye-setki',8)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Откосы и подоконники', 'otkosy-podokonniki', 7 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'otkosy-podokonniki'
CROSS JOIN LATERAL (VALUES ('Пластиковые откосы','plastikovye-otkosy',1),('Штукатурные откосы','shtukaturnye-otkosy',2),('Гипсокартонные откосы','gkl-otkosy',3),('Подоконники ПВХ и камень','podokonniki',4),('Откосы на окна и двери','otkosy-okna-dveri',5),('Утепление откосов','uteplenie-otkosov',6)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Стяжка пола', 'styazhka-pola', 8 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'styazhka-pola'
CROSS JOIN LATERAL (VALUES ('Полусухая стяжка','polusuhaya-styazhka',1),('Мокрая стяжка','mokraya-styazhka',2),('Наливной пол','nalivnoj-pol',3),('Стяжка с тёплым полом','styazhka-teplyj-pol',4),('Армированная стяжка','armirovannaya-styazhka',5),('Выравнивание пола','vyravnivanie-pola',6),('Гидроизоляция под стяжку','gidroizolyaciya-pod-styazhku',7),('Шлифовка стяжки','shlifovka-styazhki',8)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ламинат', 'laminat', 9 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'laminat'
CROSS JOIN LATERAL (VALUES ('Укладка ламината','ukladka-laminata',1),('Замена ламината','zamen-laminata',2),('Ремонт ламината','remont-laminata',3),('Подложка под ламинат','podlozhka-pod-laminat',4),('Плинтусы и порожки','plintusy-porozhki',5),('Ламинат на стену','laminat-na-stenu',6),('Демонтаж ламината','demontazh-laminata',7)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ламинат и паркет', 'laminat-parket', 10 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'laminat-parket'
CROSS JOIN LATERAL (VALUES ('Укладка паркета','ukladka-parketa',1),('Инженерная доска','inzhenernaya-doska',2),('Пробковый пол','probkovyj-pol',3),('Подложка и подготовка','podlozhka-podgotovka',4),('Шлифовка и циклёвка паркета','shlifovka-parketa',5),('Лакировка и масло паркета','lakirovka-parketa',6),('Ремонт пола','remont-pola',7)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Перегородки', 'peregorodki', 11 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'peregorodki'
CROSS JOIN LATERAL (VALUES ('Гипсокартонные перегородки','gkl-peregorodki',1),('Раздвижные перегородки','razdvizhnye-peregorodki',2),('Стеклянные перегородки','steklyannye-peregorodki',3),('Демонтаж перегородок','demontazh-peregorodok',4),('Звукоизоляция перегородок','zvukoizolyaciya-peregorodok',5),('Арки из ГКЛ','arki-gkl',6),('Короба и ниши из ГКЛ','koroba-nishi-gkl',7),('Перегородки из блоков','peregorodki-iz-blokov',8)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Обои и покраска', 'oboi-pokraska', 12 FROM public.categories c WHERE c.slug = 'otdelka-remont';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otdelka-remont' AND s.slug = 'oboi-pokraska'
CROSS JOIN LATERAL (VALUES ('Поклейка обоев','pokleyka-oboev',1),('Покраска стен и потолков','pokraska-sten-potolkov',2),('Декоративная покраска','dekorativnaya-pokraska',3),('Снятие старых обоев','snyatie-staryh-oboev',4),('Подготовка под обои/покраску','podgotovka-pod-oboi',5),('Флизелиновые и виниловые обои','flizelin-vinil',6),('Жидкие обои','zhidkie-oboi',7)) AS v(n,sl,ord);

-- Автосервис
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Двигатель и моторист', 'dvigatel', 1 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'dvigatel'
CROSS JOIN LATERAL (VALUES ('Капремонт двигателя','kapremont',1),('Замена ГРМ','zamen-grm',2),('Диагностика','diagnostika',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Кузовной ремонт', 'kuzovnoj-remont', 2 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'kuzovnoj-remont'
CROSS JOIN LATERAL (VALUES ('Рихтовка','rihtovka',1),('Покраска','pokraska',2),('Сварка кузова','svarka-kuzova',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Шиномонтаж', 'shinomontazh', 3 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'shinomontazh'
CROSS JOIN LATERAL (VALUES ('Снятие/установка шин','snyatie-ustanovka',1),('Балансировка','balansirovka',2),('Ремонт проколов','remont-prokolov',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Автоэлектрик', 'avtoelektrik', 4 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'avtoelektrik'
CROSS JOIN LATERAL (VALUES ('Диагностика электрики','diagnostika-elektriki',1),('Ремонт проводки','remont-provodki',2),('Генератор и стартер','generator-starter',3),('Аккумулятор и зарядка','akkumulyator',4),('Сигнализация и автозапуск','signalizaciya-avtozapusk',5),('Парктроники и камеры','parktroniki-kamery',6),('Освещение и фары','osveshchenie-fary',7),('Блоки управления ECU','bloki-upravleniya',8)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Детейлинг', 'detejling', 5 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'detejling'
CROSS JOIN LATERAL (VALUES ('Детейлинг-мойка','detejling-mojka',1),('Полировка кузова','polirovka-kuzova',2),('Химчистка салона','himchistka-salona',3),('Керамическое покрытие','keramicheskoe-pokrytie',4),('Защитная плёнка PPF','zashhitnaya-plenka',5),('Полировка фар','polirovka-far',6),('Жидкое стекло','zhidkoe-steklo',7),('Консервация авто','konservaciya',8)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ремонт КПП', 'remont-kpp', 6 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'remont-kpp'
CROSS JOIN LATERAL (VALUES ('Ремонт МКПП','remont-mkpp',1),('Ремонт АКПП','remont-akpp',2),('Замена сцепления','zamen-scepleniya',3),('Замена масла в КПП','zamen-masla-kpp',4),('Диагностика КПП','diagnostika-kpp',5),('Ремонт раздатки','remont-razdatki',6),('Замена ШРУС','zamen-shrus',7),('Ремонт кардана','remont-kardana',8),('Адаптация АКПП','adaptaciya-akpp',9)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ходовая часть', 'hodovaya-chast', 7 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'hodovaya-chast'
CROSS JOIN LATERAL (VALUES ('Замена амортизаторов','zamen-amortizatorov',1),('Рычаги и сайлентблоки','rychagi-sajlentbloki',2),('Рулевая рейка','rulevaya-rejka',3),('Сход-развал','shod-razval',4),('Стойки стабилизатора','stojki-stabilizatora',5),('Рулевые тяги и наконечники','rulevye-tyagi',6),('Подшипники ступицы','podshipniki-stupicy',7),('Пневмоподвеска','pnevmopodveska',8),('Замена пружин','zamen-pruzhin',9)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Тормозная система', 'tormoznaya-sistema', 8 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'tormoznaya-sistema'
CROSS JOIN LATERAL (VALUES ('Замена колодок','zamen-kolodok',1),('Замена дисков и барабанов','zamen-diskov-barabanov',2),('Ремонт суппортов','remont-supportov',3),('Прокачка тормозов','prokachka-tormozov',4),('Диагностика ABS/ESP','diagnostika-abs-esp',5),('Тормозные шланги','tormoznye-shlangi',6),('Стояночный тормоз','stoyanochnyj-tormoz',7)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Кондиционер и климат', 'kondicioner-klimat', 9 FROM public.categories c WHERE c.slug = 'autoservice';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'kondicioner-klimat'
CROSS JOIN LATERAL (VALUES ('Заправка кондиционера','zapravka-kondicionera',1),('Диагностика кондиционера','diagnostika-kondicionera',2),('Поиск утечек фреона','poisk-utechek',3),('Ремонт компрессора','remont-kompressora',4),('Замена радиатора/испарителя','zamen-radiatora-isparitelya',5),('Чистка и дезинфекция','chistka-dezinfekciya',6),('Климат-контроль','klimat-kontrol',7)) AS v(n,sl,ord);

-- Грузоперевозки: подкатегории по типу перевозки, в каждой — свои услуги
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Длинномер', 'dlinomer', 1 FROM public.categories c WHERE c.slug = 'gruzoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'gruzoperevozki' AND s.slug = 'dlinomer'
CROSS JOIN LATERAL (VALUES ('До 6 м','do-6m',1),('До 9 м','do-9m',2),('До 12 м','do-12m',3),('Негабарит','negabarit',4),('Лес и пиломатериалы','les-pilomaterialy',5),('Металлопрокат','metalloprokant',6),('ЖБИ','zhbi',7)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Курьерская доставка', 'kurereskaya-dostavka', 2 FROM public.categories c WHERE c.slug = 'gruzoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'gruzoperevozki' AND s.slug = 'kurereskaya-dostavka'
CROSS JOIN LATERAL (VALUES ('По городу','po-gorodu',1),('Межгород','mezhgorod',2),('Срочная доставка','srochnaya',3),('Документы и мелкие грузы','dokumenty-melkije',4),('Крупногабарит','krupnogabarit',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Перевозка стройматериалов', 'perevozka-stroymaterialov', 3 FROM public.categories c WHERE c.slug = 'gruzoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'gruzoperevozki' AND s.slug = 'perevozka-stroymaterialov'
CROSS JOIN LATERAL (VALUES ('Кирпич и блоки','kirpich-bloki',1),('Песок и щебень','pesok-scheben',2),('Пиломатериалы','pilomaterialy',3),('ЖБИ','zhbi',4),('Доставка с разгрузкой','s-razgruzkoj',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Квартирный переезд', 'kvartirnyj-pereezd', 4 FROM public.categories c WHERE c.slug = 'gruzoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'gruzoperevozki' AND s.slug = 'kvartirnyj-pereezd'
CROSS JOIN LATERAL (VALUES ('В пределах города','v-gorode',1),('Межгород','mezhgorod',2),('С упаковкой','s-upakovkoj',3),('Без упаковки','bez-upakovki',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Грузы (общие)', 'gruzy-obshchie', 5 FROM public.categories c WHERE c.slug = 'gruzoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'gruzoperevozki' AND s.slug = 'gruzy-obshchie'
CROSS JOIN LATERAL (VALUES ('До 1 т','do-1-t',1),('До 3 т','do-3-t',2),('До 5 т','do-5-t',3),('До 10 т','do-10-t',4),('Газель и лёгкие','gazel-legkie',5)) AS v(n,sl,ord);

-- Спецтехника: подкатегории по типу техники
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Аграрная техника', 'agrarnaya-tehnika', 1 FROM public.categories c WHERE c.slug = 'spectehnika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'agrarnaya-tehnika'
CROSS JOIN LATERAL (VALUES ('Комбайны','kombajny',1),('Тракторы','traktory',2),('Сеялки и культиваторы','seyalki-kultivatory',3),('Опрыскиватели','opryskivateli',4),('Пресс-подборщики','press-podborshchiki',5),('Транспортировка с/х техники','transportirovka-selhoz',6)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Краны', 'krany', 2 FROM public.categories c WHERE c.slug = 'spectehnika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'krany'
CROSS JOIN LATERAL (VALUES ('Автокран','avtokran',1),('Башенный кран','bashennyj-kran',2),('Гусеничный кран','gusenichnyj-kran',3),('Монтажные работы','montazhnye-raboty',4),('Перевозка крана','perevozka-krana',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Самосвалы', 'samosvaly', 3 FROM public.categories c WHERE c.slug = 'spectehnika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'samosvaly'
CROSS JOIN LATERAL (VALUES ('Аренда самосвала','arenda-samosvala',1),('Перевозка сыпучих грузов','perevozka-sypuchih',2),('Вывоз грунта','vyvoz-grunta',3),('Строительные перевозки','stroitelnye-perevozki',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Экскаваторы', 'ekskavatory', 4 FROM public.categories c WHERE c.slug = 'spectehnika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'ekskavatory'
CROSS JOIN LATERAL (VALUES ('Колёсный экскаватор','kolyosnyj-ekskavator',1),('Гусеничный экскаватор','gusenichnyj-ekskavator',2),('Мини-экскаватор','mini-ekskavator',3),('Земляные работы','zemlyanye-raboty',4),('Копка котлованов','kopka-kotlovanov',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Погрузчики', 'pogruzchiki', 5 FROM public.categories c WHERE c.slug = 'spectehnika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'pogruzchiki'
CROSS JOIN LATERAL (VALUES ('Фронтальный погрузчик','frontalnyj-pogruzchik',1),('Вилочный погрузчик','vilkovyj-pogruzchik',2),('Погрузочно-разгрузочные работы','pogruzochnye-raboty',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Буровая техника', 'burovaya-tehnika', 6 FROM public.categories c WHERE c.slug = 'spectehnika';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'burovaya-tehnika'
CROSS JOIN LATERAL (VALUES ('Ямобур','yamobur',1),('Бурение скважин','burenie-skvazhin',2),('Свайные работы','svajnye-raboty',3)) AS v(n,sl,ord);

-- Благоустройство (без заборов и ворот; без освещения участка и малых форм)
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Участок и озеленение', 'uchastok-ozelenenie', 1 FROM public.categories c WHERE c.slug = 'blagoustrojstvo';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'blagoustrojstvo' AND s.slug = 'uchastok-ozelenenie'
CROSS JOIN LATERAL (VALUES ('Газон','gazon',1),('Посадки и клумбы','posadki-klumby',2),('Дренаж участка','drenazh-uchastka',3),('Ландшафтный дизайн','landshaftnyj-dizajn',4),('Вертикальное озеленение','vertikalnoe-ozelenenie',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Мощение и брусчатка', 'moshchenie-bruschatka', 2 FROM public.categories c WHERE c.slug = 'blagoustrojstvo';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'blagoustrojstvo' AND s.slug = 'moshchenie-bruschatka'
CROSS JOIN LATERAL (VALUES ('Тротуарная плитка','trotuarnaya-plitka',1),('Брусчатка','bruschatka',2),('Дорожки и площадки','dorozhki-ploshadki',3),('Отмостка','otmostka',4),('Подпорные стенки','podpornye-stenki',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Дренаж и ливнёвка', 'drenazh-livnevka', 3 FROM public.categories c WHERE c.slug = 'blagoustrojstvo';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'blagoustrojstvo' AND s.slug = 'drenazh-livnevka'
CROSS JOIN LATERAL (VALUES ('Ливневая канализация','livnevaya-kanalizaciya',1),('Дренажные колодцы','drenazhnye-kolodcy',2),('Уклон и водоотведение','uklon-vodootvedenie',3),('Трубы и ливнёвка','truby-livnevka',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Полив и автополив', 'poliv-avtopoliv', 4 FROM public.categories c WHERE c.slug = 'blagoustrojstvo';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'blagoustrojstvo' AND s.slug = 'poliv-avtopoliv'
CROSS JOIN LATERAL (VALUES ('Системы полива','sistemy-poliva',1),('Автополив','avtopoliv',2),('Капельный полив','kapelnyj-poliv',3),('Скважины для участка','skvazhiny-uchastok',4)) AS v(n,sl,ord);

-- Художественная ковка: ковка, сварные изделия, монтаж, реставрация
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ковка и металл', 'kovka-metall', 1 FROM public.categories c WHERE c.slug = 'hudozhestvennaya-kovka';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'hudozhestvennaya-kovka' AND s.slug = 'kovka-metall'
CROSS JOIN LATERAL (VALUES ('Ворота и калитки','vorota-kalitki',1),('Перила и ограждения','perila',2),('Мангалы и кованая мебель','mangaly',3),('Решётки и балконы','reshetki-balkony',4),('Кованый декор','kovanyj-dekor',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Сварные изделия', 'svarnye-izdeliya', 2 FROM public.categories c WHERE c.slug = 'hudozhestvennaya-kovka';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'hudozhestvennaya-kovka' AND s.slug = 'svarnye-izdeliya'
CROSS JOIN LATERAL (VALUES ('Сварные решётки','svarnye-reshetki',1),('Декоративная сварка','dekorativnaya-svarka',2),('Каркасы и конструкции','karkasy-konstrukcii',3),('Художественная сварка','hudozhestvennaya-svarka',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Монтаж и установка', 'montazh-ustanovka', 3 FROM public.categories c WHERE c.slug = 'hudozhestvennaya-kovka';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'hudozhestvennaya-kovka' AND s.slug = 'montazh-ustanovka'
CROSS JOIN LATERAL (VALUES ('Установка ворот и калиток','ustanovka-vorot-kalitok',1),('Монтаж перил и ограждений','montazh-peril',2),('Установка кованых изделий','ustanovka-kovanyh',3),('Монтаж решёток','montazh-reshetok',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ремонт и реставрация', 'remont-restavraciya', 4 FROM public.categories c WHERE c.slug = 'hudozhestvennaya-kovka';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'hudozhestvennaya-kovka' AND s.slug = 'remont-restavraciya'
CROSS JOIN LATERAL (VALUES ('Реставрация ковки','restavraciya-kovki',1),('Покраска и покрытие металла','pokraska-metalla',2),('Антикоррозийная обработка','antikorroziynaya',3)) AS v(n,sl,ord);

-- Пром-альпинизм: подкатегории с разными типами услуг (без дублей)
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Высотные работы', 'vysotnye-raboty', 1 FROM public.categories c WHERE c.slug = 'prom-alpinizm';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'prom-alpinizm' AND s.slug = 'vysotnye-raboty'
CROSS JOIN LATERAL (VALUES ('Верхолазные работы','verholaznye-raboty',1),('Такелажные работы','takelazhnye-raboty',2),('Спуск и подъём грузов','spusk-podyom-gruzov',3),('Обследование фасадов и кровли','obsledovanie-fasadov',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Мойка и чистка на высоте', 'moyka-chistka-vysota', 2 FROM public.categories c WHERE c.slug = 'prom-alpinizm';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'prom-alpinizm' AND s.slug = 'moyka-chistka-vysota'
CROSS JOIN LATERAL (VALUES ('Мойка фасадов','moyka-fasadov',1),('Мойка окон','moyka-okon',2),('Чистка кровли','chistka-krovli',3),('Чистка водостоков','chistka-vodostokov',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Монтаж на высоте', 'montazh-na-vysote', 3 FROM public.categories c WHERE c.slug = 'prom-alpinizm';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'prom-alpinizm' AND s.slug = 'montazh-na-vysote'
CROSS JOIN LATERAL (VALUES ('Установка кондиционеров','ustanovka-kondicionerov',1),('Антенны и спутники','antenny-sputniki',2),('Монтаж рекламы и вывесок','montazh-reklamy',3),('Световые короба и конструкции','svetovye-koroba',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Ремонт и удаление снега', 'remont-sneg-vysota', 4 FROM public.categories c WHERE c.slug = 'prom-alpinizm';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'prom-alpinizm' AND s.slug = 'remont-sneg-vysota'
CROSS JOIN LATERAL (VALUES ('Ремонт фасадов на высоте','remont-fasadov-vysota',1),('Герметизация швов','germetizaciya-shvov',2),('Сброс снега с крыш','sbros-snega-krysh',3),('Удаление сосулек','udalenie-sosulek',4)) AS v(n,sl,ord);

-- Откачка и очистка канализации: подкатегории без дублирующих услуг
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Откачка (илосос)', 'otkachka-ilosos', 1 FROM public.categories c WHERE c.slug = 'otkachka-kanalizacii';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otkachka-kanalizacii' AND s.slug = 'otkachka-ilosos'
CROSS JOIN LATERAL (VALUES ('Откачка выгребных ям','otkachka-vygrebnyh-yam',1),('Откачка септиков','otkachka-septikov',2),('Откачка колодцев','otkachka-kolodcev',3),('Вывоз жидких отходов','vyvoz-zhidkih-othodov',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Чистка и обслуживание септиков', 'chistka-obsluzhivanie-septikov', 2 FROM public.categories c WHERE c.slug = 'otkachka-kanalizacii';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otkachka-kanalizacii' AND s.slug = 'chistka-obsluzhivanie-septikov'
CROSS JOIN LATERAL (VALUES ('Чистка септиков','chistka-septikov',1),('Обслуживание ЛОС','obsluzhivanie-los',2),('Ремонт септиков','remont-septikov',3),('Замена фильтров ЛОС','zamen-filtrov-los',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Прочистка труб канализации', 'prochistka-trub', 3 FROM public.categories c WHERE c.slug = 'otkachka-kanalizacii';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'otkachka-kanalizacii' AND s.slug = 'prochistka-trub'
CROSS JOIN LATERAL (VALUES ('Прочистка засоров','prochistka-zasorov',1),('Гидродинамическая прочистка','gidrodinamicheskaya-prochistka',2),('Видеоинспекция труб','videoinspekciya-trub',3),('Прочистка от отложений','prochistka-ot-otlozhenij',4)) AS v(n,sl,ord);

-- Водоснабжение и привоз воды: скважины, колодцы, привоз воды, водоподготовка
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Скважины и насосы', 'skvazhiny-nasosy', 1 FROM public.categories c WHERE c.slug = 'vodosnabzhenie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'vodosnabzhenie' AND s.slug = 'skvazhiny-nasosy'
CROSS JOIN LATERAL (VALUES ('Бурение скважин','burenie-skvazhin',1),('Обустройство скважин (оголовок, адаптер)','obustrojstvo-skvazhin',2),('Насосы и насосные станции','nasosy-nasosnye-stantsii',3),('Кессоны и адаптеры','kessony-adaptery',4),('Водопровод от скважины (подвод в дом)','vodoprovod-ot-skvazhiny',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Колодцы', 'kolodcy', 2 FROM public.categories c WHERE c.slug = 'vodosnabzhenie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'vodosnabzhenie' AND s.slug = 'kolodcy'
CROSS JOIN LATERAL (VALUES ('Копка колодцев','kopka-kolodcev',1),('Ремонт и углубление колодцев','remont-uglublenie-kolodcev',2),('Чистка колодцев','chistka-kolodcev',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Привоз воды', 'privoz-vody', 3 FROM public.categories c WHERE c.slug = 'vodosnabzhenie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'vodosnabzhenie' AND s.slug = 'privoz-vody'
CROSS JOIN LATERAL (VALUES ('Доставка питьевой воды (бутыли, кулеры)','dostavka-pitevoj-vody',1),('Вода для строительства (по кубам)','voda-dlya-stroitelstva',2),('Вода для полива и бассейнов','voda-poliv-bassejny',3),('Регулярная доставка воды (абонемент)','regulyarnaya-dostavka-vody',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Водоподготовка и фильтры', 'vodopodgotovka-filtry', 4 FROM public.categories c WHERE c.slug = 'vodosnabzhenie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'vodosnabzhenie' AND s.slug = 'vodopodgotovka-filtry'
CROSS JOIN LATERAL (VALUES ('Фильтры для скважинной воды','filtry-skvazhinnaya-voda',1),('Системы очистки и умягчения','sistemy-ochistki-umyagcheniya',2),('Подключение и обслуживание фильтров','podklyuchenie-obsluzhivanie-filtrov',3)) AS v(n,sl,ord);

-- Клининг: подкатегории и услуги без дублей (помещения, химчистка, окна, мероприятия, дезинфекция)
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Уборка помещений', 'uborka-pomeshchenij', 1 FROM public.categories c WHERE c.slug = 'klining';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'klining' AND s.slug = 'uborka-pomeshchenij'
CROSS JOIN LATERAL (VALUES ('Генеральная уборка','generalnaya',1),('Уборка после ремонта','posle-remonta',2),('Ежедневная уборка','ezhednevnaya',3),('Поддерживающая уборка','podderzhivayushchaya',4),('Уборка офисов','uborka-ofisov',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Химчистка', 'himchistka', 2 FROM public.categories c WHERE c.slug = 'klining';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'klining' AND s.slug = 'himchistka'
CROSS JOIN LATERAL (VALUES ('Химчистка мебели','himchistka-mebeli',1),('Химчистка ковров','himchistka-kovrov',2),('Химчистка штор','himchistka-shtor',3),('Химчистка матрасов','himchistka-matrasov',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Мытьё окон (в помещениях)', 'moyka-okon-pomeshcheniya', 3 FROM public.categories c WHERE c.slug = 'klining';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'klining' AND s.slug = 'moyka-okon-pomeshcheniya'
CROSS JOIN LATERAL (VALUES ('Мытьё окон в помещениях','moyka-okon-vnutri',1),('Мытьё витрин','moyka-vitrin',2),('Мойка остекления','moyka-ostekleniya',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Уборка после мероприятий', 'uborka-posle-meropriyatij', 4 FROM public.categories c WHERE c.slug = 'klining';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'klining' AND s.slug = 'uborka-posle-meropriyatij'
CROSS JOIN LATERAL (VALUES ('Уборка после праздников','uborka-posle-prazdnikov',1),('Уборка после строительства','uborka-posle-stroitelstva',2),('Уборка после переезда','uborka-posle-pereezda',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Дезинфекция и обработка', 'dezinfekciya-obrabotka', 5 FROM public.categories c WHERE c.slug = 'klining';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'klining' AND s.slug = 'dezinfekciya-obrabotka'
CROSS JOIN LATERAL (VALUES ('Дезинфекция помещений','dezinfekciya-pomeshchenij',1),('Обработка от запахов','obrabotka-ot-zapahov',2),('Удаление плесени','udalenie-pleseni',3)) AS v(n,sl,ord);

-- Мастер на час: подкатегории и услуги без дублей (сборка, мелкий ремонт, мелкий электромонтаж, мелкая сантехника)
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Сборка мебели и техники', 'sborna-mebeli-tehniki', 1 FROM public.categories c WHERE c.slug = 'master-na-chas';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'master-na-chas' AND s.slug = 'sborna-mebeli-tehniki'
CROSS JOIN LATERAL (VALUES ('Сборка мебели','sborna-mebeli',1),('Разборка мебели','razborka-mebeli',2),('Установка бытовой техники','ustanovka-bytovoj-tehniki',3),('Сборка техники','sborna-tehniki',4),('Полки и шторы','polki-shtory',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Мелкий ремонт по дому', 'melkij-remont-dom', 2 FROM public.categories c WHERE c.slug = 'master-na-chas';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'master-na-chas' AND s.slug = 'melkij-remont-dom'
CROSS JOIN LATERAL (VALUES ('Мелкий ремонт','melkij-remont',1),('Замена замков','zamen-zamkov',2),('Ремонт дверей и окон','remont-dverej-okon',3),('Починка мебели','pochinka-mebeli',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Мелкий электромонтаж', 'melkij-elektromontazh', 3 FROM public.categories c WHERE c.slug = 'master-na-chas';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'master-na-chas' AND s.slug = 'melkij-elektromontazh'
CROSS JOIN LATERAL (VALUES ('Замена розеток и выключателей','zamen-rozetok-vyklyuchatelej',1),('Установка светильников','ustanovka-svetilnikov',2),('Подключение бытовой техники','podklyuchenie-tehniki',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Мелкие сантехнические работы', 'melkie-santehnicheskie-raboty', 4 FROM public.categories c WHERE c.slug = 'master-na-chas';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'master-na-chas' AND s.slug = 'melkie-santehnicheskie-raboty'
CROSS JOIN LATERAL (VALUES ('Замена смесителя','zamen-smesitelya',1),('Установка полотенцесушителя','ustanovka-polotentsesushitelya',2),('Установка фильтра воды','ustanovka-filtra-vody',3)) AS v(n,sl,ord);

-- Охрана и безопасность: подкатегории и услуги
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Охрана и видеонаблюдение', 'ohrana-videonablyudenie', 1 FROM public.categories c WHERE c.slug = 'ohrana-bezopasnost';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'ohrana-bezopasnost' AND s.slug = 'ohrana-videonablyudenie'
CROSS JOIN LATERAL (VALUES ('Видеонаблюдение','videonablyudenie',1),('Сигнализация','signalizaciya',2),('Охрана объектов','ohrana-obektov',3),('Установка камер','ustanovka-kamer',4),('Домофоны и видеодомофоны','domofony-videodomofony',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Пожарная безопасность', 'pozharnaya-bezopasnost', 2 FROM public.categories c WHERE c.slug = 'ohrana-bezopasnost';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'ohrana-bezopasnost' AND s.slug = 'pozharnaya-bezopasnost'
CROSS JOIN LATERAL (VALUES ('Пожарная сигнализация','pozharnaya-signalizaciya',1),('Огнетушители и обслуживание','ognetushiteli',2),('Системы оповещения','sistemy-opoveshcheniya',3),('Пожарные краны и рукава','pozharnye-krany',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Контроль доступа', 'kontrol-dostupa', 3 FROM public.categories c WHERE c.slug = 'ohrana-bezopasnost';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'ohrana-bezopasnost' AND s.slug = 'kontrol-dostupa'
CROSS JOIN LATERAL (VALUES ('СКУД','skud',1),('Турникеты и шлагбаумы','turnikety-shlagbaumy',2),('Замки и домофоны','zamki-domofony',3),('Электронные ключи и карты','elektronnye-klyuchi',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Охранные услуги', 'ohrannye-uslugi', 4 FROM public.categories c WHERE c.slug = 'ohrana-bezopasnost';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'ohrana-bezopasnost' AND s.slug = 'ohrannye-uslugi'
CROSS JOIN LATERAL (VALUES ('Физическая охрана','fizicheskaya-ohrana',1),('Охрана мероприятий','ohrana-meropriyatij',2),('Патрулирование','patrulirovanie',3),('Охрана территории','ohrana-territorii',4)) AS v(n,sl,ord);

-- Вывоз мусора
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Вывоз отходов', 'vyvoz-othodov', 1 FROM public.categories c WHERE c.slug = 'vyvoz-musora';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'vyvoz-musora' AND s.slug = 'vyvoz-othodov'
CROSS JOIN LATERAL (VALUES ('Строительный мусор','stroitelnyj-musor',1),('Крупногабаритный вывоз','krupnogabarit',2),('Контейнер 8 м³','kontainer-8',3)) AS v(n,sl,ord);

-- Грузчики
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Погрузочно-разгрузочные работы', 'pogruzochnye', 1 FROM public.categories c WHERE c.slug = 'gruzchiki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'gruzchiki' AND s.slug = 'pogruzochnye'
CROSS JOIN LATERAL (VALUES ('Переезд','pereezd',1),('Грузчики почасово','pochasovo',2),('Такелаж','takelez',3)) AS v(n,sl,ord);

-- Разнорабочие: подкатегории и услуги без дублей с Грузчики, Клининг, Вывоз мусора, Спецтехника
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Подсобные на стройке', 'podsobnye-na-stroyke', 1 FROM public.categories c WHERE c.slug = 'raznorabochye';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'raznorabochye' AND s.slug = 'podsobnye-na-stroyke'
CROSS JOIN LATERAL (VALUES ('Подсобные на стройке','podsobnye-stroyka',1),('Подача материалов по объекту','podacha-materialov',2),('Подготовка участка','podgotovka-uchastka',3),('Вынос мусора с объекта','vynos-musora-s-obekta',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Земляные работы (вручную)', 'zemlyanye-raboty-vruchnuyu', 2 FROM public.categories c WHERE c.slug = 'raznorabochye';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'raznorabochye' AND s.slug = 'zemlyanye-raboty-vruchnuyu'
CROSS JOIN LATERAL (VALUES ('Копка траншей','kopka-transhej',1),('Рытьё котлованов вручную','ryte-kotlovanov-vruchnuyu',2),('Выравнивание участка','vyravnivanie-uchastka',3),('Расчистка территории','raschistka-territorii',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Демонтаж и разборка', 'demontazh-razborka', 3 FROM public.categories c WHERE c.slug = 'raznorabochye';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'raznorabochye' AND s.slug = 'demontazh-razborka'
CROSS JOIN LATERAL (VALUES ('Черновой демонтаж','chernovoj-demontazh',1),('Разбор конструкций','razbor-konstrukcij',2),('Разбор завалов','razbor-zavalov',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Вспомогательные работы', 'vspomogatelnye-raboty', 4 FROM public.categories c WHERE c.slug = 'raznorabochye';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'raznorabochye' AND s.slug = 'vspomogatelnye-raboty'
CROSS JOIN LATERAL (VALUES ('Расчистка снега на объекте','raschistka-snega',1),('Подсобные на кровле','podsobnye-krovlya',2),('Кладка под мастеров','kladka-pod-masterov',3)) AS v(n,sl,ord);

-- Автоподбор: подбор, проверка авто (документы, бито/крашено), оформление сделки
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Подбор автомобиля', 'podbor-avto', 1 FROM public.categories c WHERE c.slug = 'avtopodbor';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'avtopodbor' AND s.slug = 'podbor-avto'
CROSS JOIN LATERAL (VALUES ('Подбор б/у','podbor-bu',1),('Сопровождение сделки','soprovozhdenie-sdelki',2),('Подбор по параметрам','podbor-po-parametram',3),('Выезд на осмотр','vyezd-na-osmotr',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Проверка авто перед покупкой', 'proverka-avto', 2 FROM public.categories c WHERE c.slug = 'avtopodbor';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'avtopodbor' AND s.slug = 'proverka-avto'
CROSS JOIN LATERAL (VALUES ('Проверка документов','proverka-dokumentov',1),('Проверка на битость и крашенность','proverka-bito-krasheno',2),('Проверка по базам (залог, ДТП)','proverka-po-bazam',3),('Юридическая чистота','yuridicheskaya-chistota',4),('Осмотр на СТО','osmotr-na-sto',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Оформление сделки', 'oformlenie-sdelki', 3 FROM public.categories c WHERE c.slug = 'avtopodbor';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'avtopodbor' AND s.slug = 'oformlenie-sdelki'
CROSS JOIN LATERAL (VALUES ('Сопровождение в ГИБДД','soprovozhdenie-gibdd',1),('Оформление договора купли-продажи','oformlenie-dogovora',2),('Проверка продавца','proverka-prodavca',3)) AS v(n,sl,ord);

-- Автоперевозки: эвакуатор, пассажирские перевозки, перевозка авто
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Эвакуатор', 'evakuator', 1 FROM public.categories c WHERE c.slug = 'avtoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'avtoperevozki' AND s.slug = 'evakuator'
CROSS JOIN LATERAL (VALUES ('Эвакуатор по городу','evakuator-po-gorodu',1),('Эвакуатор межгород','evakuator-mezhgorod',2),('Эвакуатор легковых авто','evakuator-legkovyh',3),('Эвакуатор грузовых и спецтехники','evakuator-gruzovyh',4),('Доставка авто после ремонта','dostavka-posle-remonta',5)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Пассажирские перевозки', 'passazhirskie', 2 FROM public.categories c WHERE c.slug = 'avtoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'avtoperevozki' AND s.slug = 'passazhirskie'
CROSS JOIN LATERAL (VALUES ('Трансфер','transfer',1),('Встреча в аэропорту','vstrecha-aeroport',2),('Корпоративные перевозки','korporativnye',3),('Свадьбы и мероприятия','svadby-meropriyatiya',4)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Перевозка авто', 'perevozka-avto', 3 FROM public.categories c WHERE c.slug = 'avtoperevozki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'avtoperevozki' AND s.slug = 'perevozka-avto'
CROSS JOIN LATERAL (VALUES ('Перевозка авто по РФ','perevozka-avto-rf',1),('Перевозка мототехники','perevozka-moto',2),('Перевозка лодок и катеров','perevozka-lodok-katerov',3),('Автовоз (несколько авто)','avtovoz',4)) AS v(n,sl,ord);

-- Ремонт техники
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Бытовая техника', 'bytovaya-tehnika', 1 FROM public.categories c WHERE c.slug = 'remont-tehniki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'remont-tehniki' AND s.slug = 'bytovaya-tehnika'
CROSS JOIN LATERAL (VALUES ('Стиральные машины','stiralnye-mashiny',1),('Холодильники','holodilniki',2),('Посудомоечные машины','posudomoechnye',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Цифровая техника', 'cifrovaya-tehnika', 2 FROM public.categories c WHERE c.slug = 'remont-tehniki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'remont-tehniki' AND s.slug = 'cifrovaya-tehnika'
CROSS JOIN LATERAL (VALUES ('Смартфоны и планшеты','smartfony-planshety',1),('Ноутбуки и ПК','noutbuki-pk',2),('Телевизоры и мониторы','televizory-monitory',3)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Оргтехника', 'orgtehnika', 3 FROM public.categories c WHERE c.slug = 'remont-tehniki';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'remont-tehniki' AND s.slug = 'orgtehnika'
CROSS JOIN LATERAL (VALUES ('Принтеры и МФУ','printery-mfu',1),('Кофемашины','kofemashiny',2)) AS v(n,sl,ord);

-- Дизайн и проектирование
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Архитектура и проекты', 'arhitektura', 1 FROM public.categories c WHERE c.slug = 'dizajn-proektirovanie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'dizajn-proektirovanie' AND s.slug = 'arhitektura'
CROSS JOIN LATERAL (VALUES ('Проекты домов','proekty-domov',1),('Интерьерный дизайн','interiernyj-dizajn',2),('3D визуализация','3d-vizualizaciya',3)) AS v(n,sl,ord);

-- Работы со спецоборудованием
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Сварка', 'svarka', 1 FROM public.categories c WHERE c.slug = 'specoborudovanie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'specoborudovanie' AND s.slug = 'svarka'
CROSS JOIN LATERAL (VALUES ('Аргонная сварка','argon',1),('Сварка металлоконструкций','metallokonstruktsii',2)) AS v(n,sl,ord);

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Алмазное бурение и резка', 'almaznoe-burenie', 2 FROM public.categories c WHERE c.slug = 'specoborudovanie';
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'specoborudovanie' AND s.slug = 'almaznoe-burenie'
CROSS JOIN LATERAL (VALUES ('Алмазное бурение','burenie',1),('Алмазная резка','rezka',2),('Проёмы в стенах','proemy',3)) AS v(n,sl,ord);
