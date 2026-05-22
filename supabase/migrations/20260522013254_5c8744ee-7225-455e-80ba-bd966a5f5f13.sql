ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'commodity';
CREATE INDEX IF NOT EXISTS idx_analyses_user_kind ON public.analyses(user_id, kind, created_at DESC);