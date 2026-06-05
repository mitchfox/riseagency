GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_updates TO authenticated;
GRANT ALL ON public.investor_updates TO service_role;
GRANT SELECT ON public.investor_updates TO anon;