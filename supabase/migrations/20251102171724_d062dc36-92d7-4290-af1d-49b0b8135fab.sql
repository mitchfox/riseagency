-- Make action_score nullable in performance_report_actions table
ALTER TABLE performance_report_actions 
ALTER COLUMN action_score DROP NOT NULL;