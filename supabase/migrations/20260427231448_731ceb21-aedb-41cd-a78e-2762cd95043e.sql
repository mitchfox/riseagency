DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'staff_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'marketing_schedule_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_schedule_items;
  END IF;
END $$;