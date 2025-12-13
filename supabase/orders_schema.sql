-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT,
  budget DECIMAL(10, 2),
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
  selected_master_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Order responses table (отклики мастеров)
CREATE TABLE public.order_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  master_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  price DECIMAL(10, 2),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(order_id, master_id)
);

-- Indexes for better performance
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_category ON public.orders(category);
CREATE INDEX idx_orders_city ON public.orders(city);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_responses_order_id ON public.order_responses(order_id);
CREATE INDEX idx_order_responses_master_id ON public.order_responses(master_id);
CREATE INDEX idx_order_responses_status ON public.order_responses(status);

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_responses ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Orders are viewable by everyone" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Users can delete own orders" ON public.orders
  FOR DELETE USING (auth.uid() = client_id);

-- Order responses policies
CREATE POLICY "Order responses are viewable by order owner and master" ON public.order_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_responses.order_id
      AND (orders.client_id = auth.uid() OR order_responses.master_id = auth.uid())
    )
  );

CREATE POLICY "Masters can create responses" ON public.order_responses
  FOR INSERT WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Order owners can update responses" ON public.order_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_responses.order_id
      AND orders.client_id = auth.uid()
    )
  );

CREATE POLICY "Masters can delete own responses" ON public.order_responses
  FOR DELETE USING (auth.uid() = master_id);

