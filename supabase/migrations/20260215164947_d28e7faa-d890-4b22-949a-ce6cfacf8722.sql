
-- Function to check if an enum value exists
CREATE OR REPLACE FUNCTION public.check_enum_value_exists(enum_name TEXT, value_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = enum_name AND e.enumlabel = value_name
  );
END;
$$;

-- Function to add a new value to app_role enum
CREATE OR REPLACE FUNCTION public.add_app_role_enum_value(new_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS %L', new_value);
END;
$$;
