-- Portfolio items table for masters
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  master_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  videos TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_items_master_id ON public.portfolio_items(master_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_created_at ON public.portfolio_items(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view portfolio items
CREATE POLICY "Portfolio items are viewable by everyone" ON public.portfolio_items
  FOR SELECT USING (true);

-- Only masters can create portfolio items
CREATE POLICY "Masters can create portfolio items" ON public.portfolio_items
  FOR INSERT WITH CHECK (
    auth.uid() = master_id 
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
  );

-- Masters can update own portfolio items
CREATE POLICY "Masters can update own portfolio items" ON public.portfolio_items
  FOR UPDATE USING (auth.uid() = master_id);

-- Masters can delete own portfolio items
CREATE POLICY "Masters can delete own portfolio items" ON public.portfolio_items
  FOR DELETE USING (auth.uid() = master_id);

