-- Demo customer records expire without removing their storage objects.
-- Block new uploads even if another permissive storage policy exists.
CREATE POLICY customer_images_demo_insert_restriction ON storage.objects
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id <> 'customer-images'
    OR NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  );

CREATE POLICY customer_images_demo_update_restriction ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (
    bucket_id <> 'customer-images'
    OR NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  )
  WITH CHECK (
    bucket_id <> 'customer-images'
    OR NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  );
