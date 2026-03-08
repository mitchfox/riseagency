-- 1. Add 'prospect' to representation_status constraint
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_representation_status_check;
ALTER TABLE public.players ADD CONSTRAINT players_representation_status_check 
  CHECK (representation_status = ANY (ARRAY['represented'::text, 'mandated'::text, 'previously_mandated'::text, 'scouted'::text, 'other'::text, 'fuel_for_football'::text, 'prospect'::text]));

-- 2. Create nutrition_recipes table
CREATE TABLE public.nutrition_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  ingredients text,
  method text,
  calories text,
  protein text,
  carbs text,
  fat text,
  image_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage recipes" ON public.nutrition_recipes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3. Create player_recipe_assignments to control which recipes show to which player/phase
CREATE TABLE public.player_recipe_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.nutrition_recipes(id) ON DELETE CASCADE,
  phase_name text,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, recipe_id)
);

ALTER TABLE public.player_recipe_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage recipe assignments" ON public.player_recipe_assignments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Players can view their recipes" ON public.player_recipe_assignments
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anyone can view recipes" ON public.nutrition_recipes
  FOR SELECT TO anon
  USING (true);