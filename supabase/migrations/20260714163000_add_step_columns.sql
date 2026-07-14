ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_time_step NUMERIC DEFAULT 0.1;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_profit_rate_step NUMERIC DEFAULT 1;
