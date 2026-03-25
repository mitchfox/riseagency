CREATE TABLE public.marketing_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL,
  day_of_week text NOT NULL,
  scheduled_time text,
  platform_format text DEFAULT 'post',
  owner_id text,
  status text DEFAULT 'planned',
  linked_draft_id uuid,
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to marketing_schedule_items" ON public.marketing_schedule_items
  FOR ALL USING (true) WITH CHECK (true);