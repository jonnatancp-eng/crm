-- =====================================================
-- MIGRATION: Create closed_deals table and related changes
-- Run this SQL on your InsForge/PostgreSQL database
-- =====================================================

-- STEP 1: Create closed_deals table
CREATE TABLE IF NOT EXISTS closed_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value DECIMAL(12,2),
  notes TEXT,
  voided BOOLEAN DEFAULT false,
  voided_reason TEXT,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Add deal_offer_declined column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_offer_declined BOOLEAN DEFAULT false;

-- STEP 3: Create indexes for closed_deals
CREATE INDEX IF NOT EXISTS idx_closed_deals_tenant_id ON closed_deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_closed_deals_lead_id ON closed_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_closed_deals_assigned_to ON closed_deals(assigned_to);

-- Unique index to prevent duplicate active closed_deals per lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_closed_deals_lead_id_active
  ON closed_deals(lead_id)
  WHERE lead_id IS NOT NULL AND voided = false;

-- STEP 4: Update leads status CHECK constraint to include 'won'
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'won', 'lost'));

-- STEP 5: Create RLS policies for closed_deals
-- Note: Adjust the helper functions based on your existing auth setup
DROP POLICY IF EXISTS "closed_deals_tenant_select" ON closed_deals;
DROP POLICY IF EXISTS "closed_deals_tenant_insert" ON closed_deals;
DROP POLICY IF EXISTS "closed_deals_tenant_update" ON closed_deals;
DROP POLICY IF EXISTS "closed_deals_tenant_delete" ON closed_deals;

CREATE POLICY "closed_deals_tenant_select" ON closed_deals
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "closed_deals_tenant_insert" ON closed_deals
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "closed_deals_tenant_update" ON closed_deals
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- STEP 6: Register realtime channel for closed_deals
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('closed_deals:%', 'Closed deals updates per tenant', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP TABLE IF EXISTS closed_deals;
-- ALTER TABLE leads DROP COLUMN IF EXISTS deal_offer_declined;
-- ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
-- ALTER TABLE leads ADD CONSTRAINT leads_status_check
--   CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'));
