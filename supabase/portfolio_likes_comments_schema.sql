-- Portfolio likes table
CREATE TABLE IF NOT EXISTS public.portfolio_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(portfolio_item_id, user_id)
);

-- Portfolio comments table
CREATE TABLE IF NOT EXISTS public.portfolio_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add likes_count to portfolio_items
ALTER TABLE public.portfolio_items 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_item_id ON public.portfolio_likes(portfolio_item_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_user_id ON public.portfolio_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_comments_item_id ON public.portfolio_comments(portfolio_item_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_comments_user_id ON public.portfolio_comments(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_comments_updated_at BEFORE UPDATE ON public.portfolio_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update portfolio likes_count
CREATE OR REPLACE FUNCTION update_portfolio_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.portfolio_items SET likes_count = likes_count + 1 WHERE id = NEW.portfolio_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.portfolio_items SET likes_count = likes_count - 1 WHERE id = OLD.portfolio_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for likes_count
CREATE TRIGGER update_portfolio_likes_count AFTER INSERT OR DELETE ON public.portfolio_likes
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_likes_count();

-- RLS Policies
ALTER TABLE public.portfolio_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_comments ENABLE ROW LEVEL SECURITY;

-- Portfolio likes policies
CREATE POLICY "Portfolio likes are viewable by everyone" ON public.portfolio_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like portfolio items" ON public.portfolio_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike portfolio items" ON public.portfolio_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolio comments policies
CREATE POLICY "Portfolio comments are viewable by everyone" ON public.portfolio_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create portfolio comments" ON public.portfolio_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio comments" ON public.portfolio_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio comments" ON public.portfolio_comments
  FOR DELETE USING (auth.uid() = user_id);

