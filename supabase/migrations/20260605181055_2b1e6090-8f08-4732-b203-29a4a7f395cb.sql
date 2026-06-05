
-- Star/shortlist columns
ALTER TABLE public.player_outreach_youth
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starred_at timestamptz,
  ADD COLUMN IF NOT EXISTS national_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS star_of_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_serious_injury text;

ALTER TABLE public.player_outreach_pro
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starred_at timestamptz,
  ADD COLUMN IF NOT EXISTS national_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS star_of_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_serious_injury text;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starred_at timestamptz,
  ADD COLUMN IF NOT EXISTS national_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS star_of_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_serious_injury text;

-- Bonus weights jsonb on scoring settings
ALTER TABLE public.recruitment_scoring_settings
  ADD COLUMN IF NOT EXISTS bonus_weights jsonb NOT NULL DEFAULT
  '{"national_team": 8, "star_of_team": 6, "previous_serious_injury": -10, "top_club": 5, "parent_approval": 5}'::jsonb;

-- Backfill position normalisation
UPDATE public.player_outreach_youth SET position = CASE LOWER(TRIM(position))
  WHEN 'midfielder' THEN 'CM' WHEN 'central midfielder' THEN 'CM' WHEN 'mid' THEN 'CM'
  WHEN 'defensive midfielder' THEN 'CDM' WHEN 'holding midfielder' THEN 'CDM'
  WHEN 'attacking midfielder' THEN 'CAM'
  WHEN 'centre back' THEN 'CB' WHEN 'center back' THEN 'CB' WHEN 'defender' THEN 'CB' WHEN 'centre-back' THEN 'CB'
  WHEN 'left back' THEN 'LB' WHEN 'right back' THEN 'RB'
  WHEN 'left wing back' THEN 'LWB' WHEN 'right wing back' THEN 'RWB'
  WHEN 'striker' THEN 'CF' WHEN 'forward' THEN 'CF' WHEN 'centre forward' THEN 'CF' WHEN 'center forward' THEN 'CF'
  WHEN 'left wing' THEN 'LW' WHEN 'right wing' THEN 'RW' WHEN 'winger' THEN 'LW'
  WHEN 'goalkeeper' THEN 'GK'
  ELSE position
END WHERE position IS NOT NULL;

UPDATE public.player_outreach_pro SET position = CASE LOWER(TRIM(position))
  WHEN 'midfielder' THEN 'CM' WHEN 'central midfielder' THEN 'CM' WHEN 'mid' THEN 'CM'
  WHEN 'defensive midfielder' THEN 'CDM' WHEN 'holding midfielder' THEN 'CDM'
  WHEN 'attacking midfielder' THEN 'CAM'
  WHEN 'centre back' THEN 'CB' WHEN 'center back' THEN 'CB' WHEN 'defender' THEN 'CB' WHEN 'centre-back' THEN 'CB'
  WHEN 'left back' THEN 'LB' WHEN 'right back' THEN 'RB'
  WHEN 'left wing back' THEN 'LWB' WHEN 'right wing back' THEN 'RWB'
  WHEN 'striker' THEN 'CF' WHEN 'forward' THEN 'CF' WHEN 'centre forward' THEN 'CF' WHEN 'center forward' THEN 'CF'
  WHEN 'left wing' THEN 'LW' WHEN 'right wing' THEN 'RW' WHEN 'winger' THEN 'LW'
  WHEN 'goalkeeper' THEN 'GK'
  ELSE position
END WHERE position IS NOT NULL;

-- Seed top clubs as R1 (skip if already present)
INSERT INTO public.club_ratings (club_name, country, first_team_rating, academy_rating) VALUES
  ('Paris Saint-Germain', 'France', 'R1', 'R1'),
  ('Real Madrid', 'Spain', 'R1', 'R1'),
  ('FC Barcelona', 'Spain', 'R1', 'R1'),
  ('Manchester City', 'England', 'R1', 'R1'),
  ('Manchester United', 'England', 'R1', 'R1'),
  ('Liverpool', 'England', 'R1', 'R1'),
  ('Arsenal', 'England', 'R1', 'R1'),
  ('Chelsea', 'England', 'R1', 'R1'),
  ('Tottenham Hotspur', 'England', 'R1', 'R1'),
  ('Bayern Munich', 'Germany', 'R1', 'R1'),
  ('Borussia Dortmund', 'Germany', 'R1', 'R1'),
  ('Juventus', 'Italy', 'R1', 'R1'),
  ('Inter Milan', 'Italy', 'R1', 'R1'),
  ('AC Milan', 'Italy', 'R1', 'R1'),
  ('Atletico Madrid', 'Spain', 'R1', 'R1'),
  ('Ajax', 'Netherlands', 'R1', 'R1'),
  ('Benfica', 'Portugal', 'R1', 'R1'),
  ('Porto', 'Portugal', 'R1', 'R1')
ON CONFLICT (club_name, country) DO NOTHING;
