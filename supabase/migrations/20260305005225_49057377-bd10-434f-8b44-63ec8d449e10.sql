
-- AI Shell Suggestions table
CREATE TABLE public.ai_shell_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('athlete_centre', 'analysis', 'data', 'player_management')),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  shell_type TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  shell_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Shell Decisions table
CREATE TABLE public.ai_shell_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.ai_shell_suggestions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_shell_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_shell_decisions ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can read suggestions" ON public.ai_shell_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suggestions" ON public.ai_shell_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete suggestions" ON public.ai_shell_suggestions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read decisions" ON public.ai_shell_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert decisions" ON public.ai_shell_decisions FOR INSERT TO authenticated WITH CHECK (true);
