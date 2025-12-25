-- ============================================
-- VAY-MASTER ADMIN PANEL SCHEMA
-- ============================================
-- Система ролей, прав доступа, модерации и аудита

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ADMIN ROLES & PERMISSIONS
-- ============================================

-- Admin roles table
CREATE TABLE public.admin_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator', 'support')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Admin permissions (granular permissions)
CREATE TABLE public.admin_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator', 'support')),
  permission TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('read', 'write', 'delete', 'manage')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default permissions
INSERT INTO public.admin_permissions (role, permission, resource, action) VALUES
-- Super Admin - полный доступ
('super_admin', 'all', 'all', 'manage'),
-- Moderator permissions
('moderator', 'moderate', 'users', 'write'),
('moderator', 'moderate', 'content', 'write'),
('moderator', 'moderate', 'complaints', 'write'),
('moderator', 'view', 'users', 'read'),
('moderator', 'view', 'orders', 'read'),
('moderator', 'view', 'analytics', 'read'),
-- Support permissions
('support', 'view', 'users', 'read'),
('support', 'view', 'orders', 'read'),
('support', 'view', 'complaints', 'read'),
('support', 'view', 'messages', 'read'),
('support', 'respond', 'complaints', 'write');

-- ============================================
-- 2. AUDIT LOGS (обязательно, нельзя удалить)
-- ============================================

CREATE TABLE public.admin_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast queries
CREATE INDEX idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_resource ON public.admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- ============================================
-- 3. USER RESTRICTIONS & BLOCKS
-- ============================================

CREATE TABLE public.user_restrictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('temporary_limit', 'hidden_from_search', 'frozen', 'banned', 'unreliable_marker')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE INDEX idx_user_restrictions_user_id ON public.user_restrictions(user_id);
CREATE INDEX idx_user_restrictions_active ON public.user_restrictions(user_id, is_active) WHERE is_active = true;

-- ============================================
-- 4. COMPLAINTS & DISPUTES
-- ============================================

CREATE TABLE public.complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  complainant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  accused_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN ('fraud', 'poor_quality', 'spam', 'harassment', 'no_contact', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB, -- URLs to images, screenshots, etc.
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);

-- Complaint actions (what admin did)
CREATE TABLE public.complaint_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'temporary_restriction', 'block', 'unreliable_marker', 'dismiss', 'escalate')),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- 5. CONTENT MODERATION
-- ============================================

CREATE TABLE public.content_moderation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('portfolio_item', 'product', 'order', 'message', 'avatar', 'description')),
  content_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden', 'flagged')),
  moderation_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_content_moderation_status ON public.content_moderation(status);
CREATE INDEX idx_content_moderation_content ON public.content_moderation(content_type, content_id);
CREATE INDEX idx_content_moderation_user_id ON public.content_moderation(user_id);

-- ============================================
-- 6. ADVERTISING & PROMOTION
-- ============================================

CREATE TABLE public.advertisements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('banner', 'master_promotion', 'product_promotion', 'search_priority', 'card_highlight')),
  target_type TEXT NOT NULL CHECK (target_type IN ('master', 'product', 'category', 'global')),
  target_id UUID, -- master_id, product_id, etc.
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  regions TEXT[], -- cities where ad is shown
  priority INTEGER DEFAULT 0, -- higher = shown first
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_advertisements_active ON public.advertisements(is_active, start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_advertisements_target ON public.advertisements(target_type, target_id);

-- Ad statistics (tracking)
CREATE TABLE public.ad_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ad_id UUID REFERENCES public.advertisements(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_ad_statistics_ad_id ON public.ad_statistics(ad_id, created_at);

-- ============================================
-- 7. MASTER VERIFICATION
-- ============================================

CREATE TABLE public.master_verification (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  master_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  verification_level TEXT CHECK (verification_level IN ('basic', 'advanced', 'premium')),
  documents JSONB, -- uploaded documents
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_master_verification_master_id ON public.master_verification(master_id);
CREATE INDEX idx_master_verification_is_verified ON public.master_verification(is_verified);

-- ============================================
-- 8. SYSTEM SETTINGS (Super Admin only)
-- ============================================

CREATE TABLE public.system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('feature_flags', 'limits', 'regions', 'ab_testing', 'system')),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- 9. SECURITY ALERTS (Anti-spam)
-- ============================================

CREATE TABLE public.security_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('mass_messages', 'duplicate_texts', 'suspicious_activity', 'suspicious_registration', 'rate_limit_exceeded')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB,
  is_resolved BOOLEAN DEFAULT false NOT NULL,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_security_alerts_resolved ON public.security_alerts(is_resolved, created_at DESC) WHERE is_resolved = false;
CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = is_admin.user_id
    AND admin_roles.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.admin_roles
    WHERE admin_roles.user_id = get_admin_role.user_id
    AND admin_roles.is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin roles: only admins can view
CREATE POLICY "Admins can view admin roles"
  ON public.admin_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin roles: only super_admin can insert/update
CREATE POLICY "Super admin can manage admin roles"
  ON public.admin_roles FOR ALL
  USING (
    public.get_admin_role(auth.uid()) = 'super_admin'
  );

-- Audit logs: only admins can view
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Audit logs: system can insert (via service role)
CREATE POLICY "System can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (true); -- Will be restricted by service role in app

-- User restrictions: admins can view and manage
CREATE POLICY "Admins can manage user restrictions"
  ON public.user_restrictions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Complaints: admins can view and manage
CREATE POLICY "Admins can manage complaints"
  ON public.complaints FOR ALL
  USING (public.is_admin(auth.uid()));

-- Complaints: users can create
CREATE POLICY "Users can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = complainant_id);

-- Content moderation: admins can manage
CREATE POLICY "Admins can manage content moderation"
  ON public.content_moderation FOR ALL
  USING (public.is_admin(auth.uid()));

-- Advertisements: admins can manage
CREATE POLICY "Admins can manage advertisements"
  ON public.advertisements FOR ALL
  USING (public.is_admin(auth.uid()));

-- Master verification: admins can manage
CREATE POLICY "Admins can manage master verification"
  ON public.master_verification FOR ALL
  USING (public.is_admin(auth.uid()));

-- System settings: only super_admin
CREATE POLICY "Super admin can manage system settings"
  ON public.system_settings FOR ALL
  USING (public.get_admin_role(auth.uid()) = 'super_admin');

-- Security alerts: admins can view and manage
CREATE POLICY "Admins can manage security alerts"
  ON public.security_alerts FOR ALL
  USING (public.is_admin(auth.uid()));

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Update updated_at on admin_roles
CREATE OR REPLACE FUNCTION public.update_admin_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_roles_updated_at();

-- Update updated_at on complaints
CREATE OR REPLACE FUNCTION public.update_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_complaints_updated_at();

-- ============================================
-- 12. INITIAL DATA
-- ============================================

-- Note: First super_admin should be created manually via SQL:
-- INSERT INTO public.admin_roles (user_id, role, created_by)
-- VALUES ('<user-uuid>', 'super_admin', '<user-uuid>');

