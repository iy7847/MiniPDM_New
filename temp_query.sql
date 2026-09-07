DO $$ 
BEGIN 
  ALTER TABLE public.process_logs ADD COLUMN IF NOT EXISTS start_qty INTEGER DEFAULT 0; 
  ALTER TABLE public.process_logs ADD COLUMN IF NOT EXISTS good_qty INTEGER DEFAULT 0; 
  ALTER TABLE public.process_logs ADD COLUMN IF NOT EXISTS defect_qty INTEGER DEFAULT 0; 
  
  UPDATE public.process_logs SET start_qty = 0 WHERE start_qty IS NULL; 
  UPDATE public.process_logs SET good_qty = 0 WHERE good_qty IS NULL; 
  UPDATE public.process_logs SET defect_qty = 0 WHERE defect_qty IS NULL; 
  
  ALTER TABLE public.process_logs ADD CONSTRAINT check_start_qty CHECK (start_qty >= 0);
  ALTER TABLE public.process_logs ADD CONSTRAINT check_good_qty CHECK (good_qty >= 0);
  ALTER TABLE public.process_logs ADD CONSTRAINT check_defect_qty CHECK (defect_qty >= 0);
END $$;
