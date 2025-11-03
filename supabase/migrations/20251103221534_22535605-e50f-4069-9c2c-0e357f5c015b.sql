-- Add end_date column to player_programs table
ALTER TABLE player_programs
ADD COLUMN end_date date;

-- Create index for efficient querying by end_date
CREATE INDEX idx_player_programs_end_date ON player_programs(end_date);

-- Add comment to explain the column
COMMENT ON COLUMN player_programs.end_date IS 'The final day (Sunday) of the last week in the program, calculated from weekly_schedules';