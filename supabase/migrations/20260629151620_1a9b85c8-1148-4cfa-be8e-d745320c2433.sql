ALTER TABLE public.club_network_contacts ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.club_map_positions ADD COLUMN IF NOT EXISTS technical_director_linkedin_url text;
ALTER TABLE public.club_map_positions ADD COLUMN IF NOT EXISTS chief_scout_linkedin_url text;