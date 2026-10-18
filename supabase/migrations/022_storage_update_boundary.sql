-- Apply the same MIME/extension/namespace boundary to object updates and moves.
ALTER POLICY secure_storage_update ON storage.objects
 USING((public.identity_session() AND (storage.foldername(name))[1]=auth.uid()::text) OR (public.staff_session() AND public.is_super_admin()))
 WITH CHECK( public.safe_object_path(name) AND
 CASE WHEN bucket_id='platform-assets' THEN public.staff_session() AND public.is_super_admin() AND name~*'\.(jpg|jpeg|png|webp|gif)$'
 WHEN bucket_id IN ('listing-images','identity-documents','dispute-evidence') THEN public.identity_session()
 AND ((storage.foldername(name))[1]=auth.uid()::text OR (bucket_id='listing-images' AND public.staff_session() AND public.is_super_admin()))
 AND CASE WHEN bucket_id='listing-images' THEN name~*'\.(jpg|jpeg|png|webp|gif)$' ELSE name~*'\.(jpg|jpeg|png|pdf)$' END
 ELSE false END);
