-- Personal schedule items per staff member
CREATE TABLE public.staff_personal_schedule_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NULL REFERENCES public.staff_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '10:00',
  lane INTEGER NOT NULL DEFAULT 0,
  done_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_personal_schedule_items TO authenticated;
GRANT ALL ON public.staff_personal_schedule_items TO service_role;

ALTER TABLE public.staff_personal_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedule items"
  ON public.staff_personal_schedule_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sps_user_date ON public.staff_personal_schedule_items(user_id, scheduled_date);

CREATE TRIGGER update_sps_updated_at
  BEFORE UPDATE ON public.staff_personal_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add visibility flag so availability slots can opt in to player portal display
ALTER TABLE public.staff_availability
  ADD COLUMN IF NOT EXISTS visible_to_players BOOLEAN NOT NULL DEFAULT true;