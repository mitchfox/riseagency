ALTER TABLE public.video_analyses ADD COLUMN source text NOT NULL DEFAULT 'staff';

-- Backfill: any existing records without auto_delete_at are likely staff-created
-- Player-uploaded ones have auto_delete_at set
UPDATE public.video_analyses SET source = 'player' WHERE auto_delete_at IS NOT NULL;