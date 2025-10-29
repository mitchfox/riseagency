-- Add scheme selection and starting XI fields to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS selected_scheme TEXT,
ADD COLUMN IF NOT EXISTS starting_xi JSONB DEFAULT '[]'::jsonb;