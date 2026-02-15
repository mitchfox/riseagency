
-- Create a table to store available roles dynamically
CREATE TABLE public.available_roles (
  role_key TEXT PRIMARY KEY,
  role_label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed with existing roles
INSERT INTO public.available_roles (role_key, role_label, description) VALUES
  ('admin', 'Admin', 'Full system access'),
  ('staff', 'Staff', 'Standard staff member access'),
  ('marketeer', 'Marketeer', 'Marketing and content focused access');

-- Enable RLS
ALTER TABLE public.available_roles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read roles
CREATE POLICY "Authenticated users can view roles"
  ON public.available_roles FOR SELECT
  TO authenticated USING (true);

-- Only admins can manage roles  
CREATE POLICY "Admins can manage roles"
  ON public.available_roles FOR ALL
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );
