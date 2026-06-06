
CREATE POLICY "Staff/admin manage proof-of-representation" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'proof-of-representation' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role)))
WITH CHECK (bucket_id = 'proof-of-representation' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role)));
