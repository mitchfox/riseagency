-- Make minute, action_type, and action_description nullable in performance_report_actions table
ALTER TABLE performance_report_actions 
ALTER COLUMN minute DROP NOT NULL,
ALTER COLUMN action_type DROP NOT NULL,
ALTER COLUMN action_description DROP NOT NULL;