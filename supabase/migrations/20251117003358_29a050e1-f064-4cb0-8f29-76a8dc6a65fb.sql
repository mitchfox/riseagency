-- Create staff availability table
CREATE TABLE IF NOT EXISTS public.staff_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for staff availability
CREATE POLICY "Staff can manage their own availability"
ON public.staff_availability
FOR ALL
USING (auth.uid() = staff_id)
WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Anyone can view staff availability"
ON public.staff_availability
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_staff_availability_staff_id ON public.staff_availability(staff_id);
CREATE INDEX idx_staff_availability_day ON public.staff_availability(day_of_week);