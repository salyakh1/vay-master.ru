-- Добавляем 'replies' в допустимые значения activity_type
ALTER TABLE public.activity_seen DROP CONSTRAINT IF EXISTS activity_seen_activity_type_check;
ALTER TABLE public.activity_seen ADD CONSTRAINT activity_seen_activity_type_check
  CHECK (activity_type IN ('comments','likes','responses','reviews','followers','replies'));

COMMENT ON TABLE public.activity_seen IS 'Время последнего просмотра списков активности (комментарии, лайки, отклики, отзывы, подписки, ответы на комментарии) для счётчика «новых»';
