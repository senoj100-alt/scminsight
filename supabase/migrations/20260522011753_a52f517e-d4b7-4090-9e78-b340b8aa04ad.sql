
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  commodity TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analyses" ON public.analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own analyses" ON public.analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own analyses" ON public.analyses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_analyses_user_created ON public.analyses(user_id, created_at DESC);
