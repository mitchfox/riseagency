-- Add assigned_to column to staff_tasks
ALTER TABLE public.staff_tasks 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_to column to staff_goals
ALTER TABLE public.staff_goals 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_staff_tasks_assigned_to ON public.staff_tasks(assigned_to);
CREATE INDEX idx_staff_goals_assigned_to ON public.staff_goals(assigned_to);