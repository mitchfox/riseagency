-- Alter staff_tasks to support multiple assignees
ALTER TABLE public.staff_tasks 
  DROP COLUMN IF EXISTS assigned_to,
  ADD COLUMN assigned_to uuid[] DEFAULT '{}';

-- Alter staff_goals to support multiple assignees  
ALTER TABLE public.staff_goals
  DROP COLUMN IF EXISTS assigned_to,
  ADD COLUMN assigned_to uuid[] DEFAULT '{}';