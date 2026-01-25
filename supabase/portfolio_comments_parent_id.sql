-- Ответы в комментариях портфолио: parent_comment_id
-- Позволяет сворачивать/разворачивать ответы по кнопке «Показать N ответов»

ALTER TABLE public.portfolio_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.portfolio_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_portfolio_comments_parent ON public.portfolio_comments(parent_comment_id);

COMMENT ON COLUMN public.portfolio_comments.parent_comment_id IS 'Родительский комментарий для ответов; NULL для корневых';
