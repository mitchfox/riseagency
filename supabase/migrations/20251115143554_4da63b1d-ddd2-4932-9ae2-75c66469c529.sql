-- Add skill-based scouting columns to scouting_reports table
ALTER TABLE scouting_reports 
ADD COLUMN IF NOT EXISTS skill_evaluations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_generated_review text;

-- skill_evaluations structure:
-- [
--   {
--     "domain": "Physical",
--     "skill_name": "Strength, Power & Speed",
--     "grade": "A",
--     "notes": ["Note 1", "Note 2"],
--     "description": "Must be physically dominant..."
--   }
-- ]

COMMENT ON COLUMN scouting_reports.skill_evaluations IS 'Array of skill evaluations with domain, skill name, grade, notes, and description';
COMMENT ON COLUMN scouting_reports.auto_generated_review IS 'AI-generated review based on skill notes and evaluations';