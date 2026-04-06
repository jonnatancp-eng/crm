-- =====================================================
-- CRM Database Schema
-- Multi-tenant B2B CRM for Lead Generation Agency
-- =====================================================

-- =====================================================
-- 1. TENANTS (Multi-tenancy root)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- =====================================================
-- 2. USERS (extends auth.users - tenant membership)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'setter' CHECK (role IN ('admin', 'setter', 'closer')),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, id)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- 3. LEADS (Contact management)
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  source TEXT CHECK (source IN ('website', 'referral', 'ads', 'organic', 'cold', 'other')),
  value DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- =====================================================
-- 4. DEALS (Sales pipeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'qualified', 'scheduled', 'closed_won', 'closed_lost')),
  value DECIMAL(12,2),
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_lead_id ON deals(lead_id);

-- =====================================================
-- 5. TASKS (Follow-ups and actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'follow_up' CHECK (type IN ('follow_up', 'call', 'email', 'meeting', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);

-- =====================================================
-- 6. NOTES (Interaction history)
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'note' CHECK (type IN ('note', 'call', 'email', 'meeting')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX idx_notes_lead_id ON notes(lead_id);
CREATE INDEX idx_notes_deal_id ON notes(deal_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- =====================================================
-- 7. ACTIVITIES (Audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'deal', 'task', 'note', 'user', 'tenant')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'assigned', 'stage_changed', 'status_changed')),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- =====================================================
-- 8. ASSIGNMENT RULES (Round robin configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rule_type TEXT DEFAULT 'round_robin' CHECK (rule_type IN ('round_robin', 'weighted', 'manual')),
  user_ids UUID[] DEFAULT '{}',
  weights JSONB DEFAULT '{}',
  last_assigned_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_assignment_rules_tenant_id ON assignment_rules(tenant_id);

-- =====================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. RLS HELPER FUNCTIONS (SECURITY DEFINER to prevent recursion)
-- =====================================================

-- Get current user's tenant_id
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is admin or closer
CREATE OR REPLACE FUNCTION is_admin_or_closer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'closer') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user owns a resource or is admin
CREATE OR REPLACE FUNCTION is_owner_or_admin(owner_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR auth.uid() = owner_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Round robin assignment function
CREATE OR REPLACE FUNCTION get_next_assignee(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  rule_rec RECORD;
  user_list UUID[];
  next_index INTEGER;
  next_user UUID;
BEGIN
  -- Get active assignment rule for tenant
  SELECT * INTO rule_rec
  FROM assignment_rules
  WHERE tenant_id = p_tenant_id AND is_active = true
  LIMIT 1;

  IF rule_rec.id IS NULL THEN
    -- Fallback: assign to first admin in tenant
    SELECT id INTO next_user
    FROM users
    WHERE tenant_id = p_tenant_id AND role = 'admin' AND is_active = true
    LIMIT 1;
    RETURN next_user;
  END IF;

  -- Get user list based on rule type
  IF rule_rec.rule_type = 'round_robin' THEN
    user_list := rule_rec.user_ids;

    IF array_length(user_list, 1) IS NULL OR array_length(user_list, 1) = 0 THEN
      -- No users in rule, get all active users in tenant
      SELECT array_agg(id) INTO user_list
      FROM users
      WHERE tenant_id = p_tenant_id AND is_active = true;
    END IF;

    -- Calculate next index
    next_index := (rule_rec.last_assigned_index + 1) % array_length(user_list, 1);
    next_user := user_list[next_index + 1]; -- PostgreSQL arrays are 1-indexed

    -- Update rule
    UPDATE assignment_rules
    SET last_assigned_index = next_index, updated_at = NOW()
    WHERE id = rule_rec.id;

    RETURN next_user;
  END IF;

  -- Default: return first admin
  SELECT id INTO next_user
  FROM users
  WHERE tenant_id = p_tenant_id AND role = 'admin' AND is_active = true
  LIMIT 1;

  RETURN next_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. RLS POLICIES - TENANTS
-- =====================================================
CREATE POLICY "users_view_own_tenant" ON tenants
  FOR SELECT USING (id = current_tenant_id());

CREATE POLICY "admin_update_tenant" ON tenants
  FOR UPDATE USING (id = current_tenant_id() AND is_admin())
  WITH CHECK (id = current_tenant_id() AND is_admin());

-- =====================================================
-- 12. RLS POLICIES - USERS
-- =====================================================
CREATE POLICY "users_view_tenant_members" ON users
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_insert_user" ON users
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND is_admin()
  );

CREATE POLICY "admin_update_user" ON users
  FOR UPDATE USING (tenant_id = current_tenant_id() AND is_admin())
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin());

CREATE POLICY "admin_delete_user" ON users
  FOR DELETE USING (tenant_id = current_tenant_id() AND is_admin());

-- =====================================================
-- 13. RLS POLICIES - LEADS
-- =====================================================
CREATE POLICY "users_view_tenant_leads" ON leads
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "users_create_tenant_leads" ON leads
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "admin_update_any_lead" ON leads
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      is_admin() OR
      (role = 'closer' AND owner_id = auth.uid()) OR
      (role = 'setter' AND owner_id = auth.uid())
    )
  )
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "admin_delete_leads" ON leads
  FOR DELETE USING (tenant_id = current_tenant_id() AND is_admin());

-- =====================================================
-- 14. RLS POLICIES - DEALS
-- =====================================================
CREATE POLICY "users_view_tenant_deals" ON deals
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "users_create_tenant_deals" ON deals
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "users_update_tenant_deals" ON deals
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      is_admin() OR owner_id = auth.uid()
    )
  )
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "admin_delete_deals" ON deals
  FOR DELETE USING (tenant_id = current_tenant_id() AND is_admin());

-- =====================================================
-- 15. RLS POLICIES - TASKS
-- =====================================================
CREATE POLICY "users_view_tenant_tasks" ON tasks
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "users_create_tenant_tasks" ON tasks
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "users_update_assigned_tasks" ON tasks
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      is_admin() OR assigned_to = auth.uid() OR created_by = auth.uid()
    )
  )
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "users_delete_own_tasks" ON tasks
  FOR DELETE USING (
    tenant_id = current_tenant_id() AND (
      is_admin() OR created_by = auth.uid()
    )
  );

-- =====================================================
-- 16. RLS POLICIES - NOTES
-- =====================================================
CREATE POLICY "users_view_tenant_notes" ON notes
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "users_create_tenant_notes" ON notes
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "users_delete_own_notes" ON notes
  FOR DELETE USING (
    tenant_id = current_tenant_id() AND (
      is_admin() OR created_by = auth.uid()
    )
  );

-- =====================================================
-- 17. RLS POLICIES - ACTIVITIES
-- =====================================================
CREATE POLICY "users_view_tenant_activities" ON activities
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "system_insert_activities" ON activities
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- =====================================================
-- 18. RLS POLICIES - ASSIGNMENT RULES
-- =====================================================
CREATE POLICY "users_view_tenant_rules" ON assignment_rules
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "admin_manage_rules" ON assignment_rules
  FOR ALL USING (tenant_id = current_tenant_id() AND is_admin())
  WITH CHECK (tenant_id = current_tenant_id() AND is_admin());

-- =====================================================
-- 19. TRIGGERS - Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON assignment_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 20. TRIGGERS - Activity logging
-- =====================================================
CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, new_values)
    VALUES (
      NEW.tenant_id,
      auth.uid(),
      'lead',
      NEW.id,
      'created',
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, old_values, new_values)
    VALUES (
      NEW.tenant_id,
      auth.uid(),
      'lead',
      NEW.id,
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );

    -- Log assignment change
    IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
      INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, old_values, new_values)
      VALUES (
        NEW.tenant_id,
        auth.uid(),
        'lead',
        NEW.id,
        'assigned',
        jsonb_build_object('old_owner', OLD.owner_id),
        jsonb_build_object('new_owner', NEW.owner_id)
      );
    END IF;

    -- Log status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, old_values, new_values)
      VALUES (
        NEW.tenant_id,
        auth.uid(),
        'lead',
        NEW.id,
        'status_changed',
        jsonb_build_object('old_status', OLD.status),
        jsonb_build_object('new_status', NEW.status)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, old_values)
    VALUES (
      OLD.tenant_id,
      auth.uid(),
      'lead',
      OLD.id,
      'deleted',
      to_jsonb(OLD)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_lead_changes
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_lead_activity();

-- =====================================================
-- 21. TRIGGERS - Deal stage changes
-- =====================================================
CREATE OR REPLACE FUNCTION log_deal_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, new_values)
    VALUES (
      NEW.tenant_id,
      auth.uid(),
      'deal',
      NEW.id,
      'created',
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log stage change
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
      INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, old_values, new_values)
      VALUES (
        NEW.tenant_id,
        auth.uid(),
        'deal',
        NEW.id,
        'stage_changed',
        jsonb_build_object('old_stage', OLD.stage),
        jsonb_build_object('new_stage', NEW.stage)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_deal_changes
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_activity();

-- =====================================================
-- 22. TRIGGERS - Auto-create user on signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Check if user already exists in users table
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create a new tenant for the user
  INSERT INTO tenants (name, slug, plan)
  VALUES (
    COALESCE(NEW.name, 'My Organization'),
    'org-' || LOWER(SUBSTRING(NEW.id::TEXT, 1, 8)),
    'free'
  )
  RETURNING id INTO new_tenant_id;

  -- Create user record
  INSERT INTO users (id, tenant_id, name, role, is_active)
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.name,
    'admin',
    true
  );

  -- Create default assignment rule
  INSERT INTO assignment_rules (tenant_id, name, rule_type, user_ids)
  VALUES (new_tenant_id, 'Default Round Robin', 'round_robin', ARRAY[NEW.id]);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 23. REALTIME CHANNELS FOR LIVE UPDATES
-- =====================================================
-- Insert realtime channels for tenant-scoped updates
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
  ('leads:%', 'Lead updates per tenant', true),
  ('deals:%', 'Deal updates per tenant', true),
  ('tasks:%', 'Task updates per tenant', true),
  ('activities:%', 'Activity feed updates', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETE - Schema ready for deployment
-- =====================================================