-- Add dynamic columns support for estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '[]'::jsonb;
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS custom_costs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_estimate_columns JSONB DEFAULT '[]'::jsonb;
