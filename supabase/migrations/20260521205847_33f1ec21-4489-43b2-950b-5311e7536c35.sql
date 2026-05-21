
-- Investor commission & salary cap detail
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS potential_commission_annual numeric,
  ADD COLUMN IF NOT EXISTS salary_cap_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.players.potential_commission_annual IS 'Potential annual commission (e.g. mandate-based, not guaranteed)';
COMMENT ON COLUMN public.players.salary_cap_overrides IS 'Per-season detail: { "2025/26": { "guaranteed": 0, "bonuses": 0, "clauses": 0, "sponsor": 0, "notes": "" } }';

-- Player <-> Club contracts log
CREATE TABLE IF NOT EXISTS public.player_club_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  contract_start date,
  contract_end date,
  annual_salary numeric,
  bonuses_notes text,
  clauses_notes text,
  sponsor_notes text,
  general_notes text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_club_contracts_player ON public.player_club_contracts(player_id);

ALTER TABLE public.player_club_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff/admin can view player club contracts"
ON public.player_club_contracts FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff/admin can manage player club contracts"
ON public.player_club_contracts FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
);

CREATE TRIGGER trg_player_club_contracts_updated
BEFORE UPDATE ON public.player_club_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEO / Social Share per-page overrides
CREATE TABLE IF NOT EXISTS public.seo_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  og_title text,
  og_description text,
  og_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_overrides_path ON public.seo_overrides(path) WHERE is_active = true;

ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seo overrides"
ON public.seo_overrides FOR SELECT
USING (true);

CREATE POLICY "Staff/admin can manage seo overrides"
ON public.seo_overrides FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
);

CREATE TRIGGER trg_seo_overrides_updated
BEFORE UPDATE ON public.seo_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
