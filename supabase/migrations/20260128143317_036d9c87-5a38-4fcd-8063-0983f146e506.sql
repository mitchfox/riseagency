-- Add recorded_stat column to store stat type and outcome per action
ALTER TABLE performance_report_actions 
ADD COLUMN recorded_stat JSONB;