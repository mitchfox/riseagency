
CREATE TABLE public.recruitment_age_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  min_contact_age INT,
  min_sign_age INT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_age_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view age rules" ON public.recruitment_age_rules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage age rules" ON public.recruitment_age_rules FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_recruitment_age_rules_updated_at
BEFORE UPDATE ON public.recruitment_age_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed European countries
INSERT INTO public.recruitment_age_rules (country, country_code, min_contact_age, min_sign_age) VALUES
('Albania', 'AL', NULL, NULL),
('Andorra', 'AD', NULL, NULL),
('Armenia', 'AM', NULL, NULL),
('Austria', 'AT', NULL, NULL),
('Azerbaijan', 'AZ', NULL, NULL),
('Belarus', 'BY', NULL, NULL),
('Belgium', 'BE', NULL, NULL),
('Bosnia and Herzegovina', 'BA', NULL, NULL),
('Bulgaria', 'BG', NULL, NULL),
('Croatia', 'HR', NULL, NULL),
('Cyprus', 'CY', NULL, NULL),
('Czech Republic', 'CZ', NULL, NULL),
('Denmark', 'DK', NULL, NULL),
('England', 'GB-ENG', NULL, NULL),
('Estonia', 'EE', NULL, NULL),
('Faroe Islands', 'FO', NULL, NULL),
('Finland', 'FI', NULL, NULL),
('France', 'FR', NULL, NULL),
('Georgia', 'GE', NULL, NULL),
('Germany', 'DE', NULL, NULL),
('Gibraltar', 'GI', NULL, NULL),
('Greece', 'GR', NULL, NULL),
('Hungary', 'HU', NULL, NULL),
('Iceland', 'IS', NULL, NULL),
('Ireland', 'IE', NULL, NULL),
('Israel', 'IL', NULL, NULL),
('Italy', 'IT', NULL, NULL),
('Kazakhstan', 'KZ', NULL, NULL),
('Kosovo', 'XK', NULL, NULL),
('Latvia', 'LV', NULL, NULL),
('Liechtenstein', 'LI', NULL, NULL),
('Lithuania', 'LT', NULL, NULL),
('Luxembourg', 'LU', NULL, NULL),
('Malta', 'MT', NULL, NULL),
('Moldova', 'MD', NULL, NULL),
('Monaco', 'MC', NULL, NULL),
('Montenegro', 'ME', NULL, NULL),
('Netherlands', 'NL', NULL, NULL),
('North Macedonia', 'MK', NULL, NULL),
('Northern Ireland', 'GB-NIR', NULL, NULL),
('Norway', 'NO', NULL, NULL),
('Poland', 'PL', NULL, NULL),
('Portugal', 'PT', NULL, NULL),
('Romania', 'RO', NULL, NULL),
('Russia', 'RU', NULL, NULL),
('San Marino', 'SM', NULL, NULL),
('Scotland', 'GB-SCT', NULL, NULL),
('Serbia', 'RS', NULL, NULL),
('Slovakia', 'SK', NULL, NULL),
('Slovenia', 'SI', NULL, NULL),
('Spain', 'ES', NULL, NULL),
('Sweden', 'SE', NULL, NULL),
('Switzerland', 'CH', NULL, NULL),
('Turkey', 'TR', NULL, NULL),
('Ukraine', 'UA', NULL, NULL),
('Wales', 'GB-WLS', NULL, NULL);
