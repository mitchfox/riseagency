-- Create table for form grade configurations
CREATE TABLE public.form_grade_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_key TEXT NOT NULL UNIQUE,
  metric_name TEXT NOT NULL,
  description TEXT,
  thresholds JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.form_grade_configs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view form grade configs" 
ON public.form_grade_configs 
FOR SELECT 
USING (true);

-- Authenticated users can manage (staff portal is already protected by auth)
CREATE POLICY "Authenticated users can manage form grade configs" 
ON public.form_grade_configs 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_form_grade_configs_updated_at
BEFORE UPDATE ON public.form_grade_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations based on existing hardcoded values
INSERT INTO public.form_grade_configs (metric_key, metric_name, description, thresholds) VALUES
('r90', 'R90 Score', 'Overall performance rating per 90 minutes', '[
  {"grade": "U", "min": null, "max": 0},
  {"grade": "D", "min": 0, "max": 0.2},
  {"grade": "C-", "min": 0.2, "max": 0.4},
  {"grade": "C", "min": 0.4, "max": 0.6},
  {"grade": "C+", "min": 0.6, "max": 0.8},
  {"grade": "B-", "min": 0.8, "max": 1.0},
  {"grade": "B", "min": 1.0, "max": 1.2},
  {"grade": "B+", "min": 1.2, "max": 1.4},
  {"grade": "A-", "min": 1.4, "max": 1.6},
  {"grade": "A", "min": 1.6, "max": 1.8},
  {"grade": "A+", "min": 1.8, "max": 2.0},
  {"grade": "A*", "min": 2.0, "max": null}
]'),
('xg', 'Expected Goals (xG)', 'Expected goals per 90 minutes', '[
  {"grade": "U", "min": null, "max": 0},
  {"grade": "D", "min": 0, "max": 0.05},
  {"grade": "C-", "min": 0.05, "max": 0.1},
  {"grade": "C", "min": 0.1, "max": 0.15},
  {"grade": "C+", "min": 0.15, "max": 0.2},
  {"grade": "B-", "min": 0.2, "max": 0.3},
  {"grade": "B", "min": 0.3, "max": 0.35},
  {"grade": "B+", "min": 0.35, "max": 0.4},
  {"grade": "A-", "min": 0.4, "max": 0.5},
  {"grade": "A", "min": 0.5, "max": 0.75},
  {"grade": "A+", "min": 0.75, "max": 1.0},
  {"grade": "A*", "min": 1.0, "max": null}
]'),
('xa', 'Expected Assists (xA)', 'Expected assists per 90 minutes', '[
  {"grade": "U", "min": null, "max": 0},
  {"grade": "D", "min": 0, "max": 0.04},
  {"grade": "C-", "min": 0.04, "max": 0.08},
  {"grade": "C", "min": 0.08, "max": 0.13},
  {"grade": "C+", "min": 0.13, "max": 0.18},
  {"grade": "B-", "min": 0.18, "max": 0.25},
  {"grade": "B", "min": 0.25, "max": 0.3},
  {"grade": "B+", "min": 0.3, "max": 0.4},
  {"grade": "A-", "min": 0.4, "max": 0.5},
  {"grade": "A", "min": 0.5, "max": 0.6},
  {"grade": "A+", "min": 0.6, "max": 0.75},
  {"grade": "A*", "min": 0.75, "max": null}
]'),
('regains', 'Regains', 'Ball recoveries per 90 minutes', '[
  {"grade": "U", "min": null, "max": 1},
  {"grade": "D", "min": 1, "max": 2},
  {"grade": "C-", "min": 2, "max": 3},
  {"grade": "C", "min": 3, "max": 4},
  {"grade": "C+", "min": 4, "max": 5},
  {"grade": "B-", "min": 5, "max": 6},
  {"grade": "B", "min": 6, "max": 7},
  {"grade": "B+", "min": 7, "max": 8},
  {"grade": "A-", "min": 8, "max": 9},
  {"grade": "A", "min": 9, "max": 10},
  {"grade": "A+", "min": 10, "max": 11},
  {"grade": "A*", "min": 11, "max": null}
]'),
('interceptions', 'Interceptions', 'Interceptions per 90 minutes', '[
  {"grade": "D", "min": null, "max": 1},
  {"grade": "C-", "min": 1, "max": 2},
  {"grade": "C+", "min": 2, "max": 3},
  {"grade": "B", "min": 3, "max": 4},
  {"grade": "A", "min": 4, "max": 5},
  {"grade": "A+", "min": 5, "max": 6},
  {"grade": "A*", "min": 6, "max": null}
]'),
('xg_chain', 'xG Chain', 'Expected goals chain per 90 minutes', '[
  {"grade": "U", "min": null, "max": 0.4},
  {"grade": "D", "min": 0.4, "max": 0.6},
  {"grade": "C-", "min": 0.6, "max": 0.8},
  {"grade": "C", "min": 0.8, "max": 1.0},
  {"grade": "C+", "min": 1.0, "max": 1.2},
  {"grade": "B-", "min": 1.2, "max": 1.4},
  {"grade": "B", "min": 1.4, "max": 1.6},
  {"grade": "B+", "min": 1.6, "max": 1.8},
  {"grade": "A-", "min": 1.8, "max": 2.2},
  {"grade": "A", "min": 2.2, "max": 2.5},
  {"grade": "A+", "min": 2.5, "max": 3.0},
  {"grade": "A*", "min": 3.0, "max": null}
]'),
('progressive_passes', 'Progressive Passes', 'Progressive passes per 90 minutes', '[
  {"grade": "U", "min": null, "max": 0},
  {"grade": "D", "min": 0, "max": 2},
  {"grade": "C", "min": 2, "max": 3},
  {"grade": "C+", "min": 3, "max": 4},
  {"grade": "B-", "min": 4, "max": 5},
  {"grade": "B", "min": 5, "max": 7},
  {"grade": "B+", "min": 7, "max": 8},
  {"grade": "A-", "min": 8, "max": 9},
  {"grade": "A", "min": 9, "max": 10},
  {"grade": "A+", "min": 10, "max": 12},
  {"grade": "A*", "min": 12, "max": null}
]'),
('pp_turnovers_ratio', 'PP/Turnovers Ratio', 'Progressive passes to turnovers ratio', '[
  {"grade": "U", "min": null, "max": 0.5},
  {"grade": "D", "min": 0.5, "max": 0.75},
  {"grade": "C-", "min": 0.75, "max": 1.0},
  {"grade": "C", "min": 1.0, "max": 1.25},
  {"grade": "C+", "min": 1.25, "max": 1.5},
  {"grade": "B-", "min": 1.5, "max": 1.75},
  {"grade": "B", "min": 1.75, "max": 2.0},
  {"grade": "B+", "min": 2.0, "max": 2.5},
  {"grade": "A-", "min": 2.5, "max": 3.0},
  {"grade": "A", "min": 3.0, "max": 3.5},
  {"grade": "A+", "min": 3.5, "max": 4.0},
  {"grade": "A*", "min": 4.0, "max": null}
]');

COMMENT ON TABLE public.form_grade_configs IS 'Stores grade threshold configurations for performance metrics';