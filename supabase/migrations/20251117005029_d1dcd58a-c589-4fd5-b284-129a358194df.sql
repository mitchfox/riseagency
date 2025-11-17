-- Drop the day_of_week column and add a date column
ALTER TABLE public.staff_availability DROP COLUMN day_of_week;
ALTER TABLE public.staff_availability ADD COLUMN availability_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Add an index for better query performance
CREATE INDEX idx_staff_availability_date ON public.staff_availability(availability_date);
CREATE INDEX idx_staff_availability_staff_date ON public.staff_availability(staff_id, availability_date);