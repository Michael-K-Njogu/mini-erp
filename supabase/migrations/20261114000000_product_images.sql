-- Optional product photos. Public delivery matches the existing customer image bucket.
ALTER TABLE public.products ADD COLUMN image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 2097152, ARRAY['image/jpeg', 'image/png']);

-- Uploads use <auth.uid()>/<random uuid>.<extension>, including before product creation.
CREATE POLICY product_images_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND COALESCE((SELECT auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('Admin', 'Sales'))
);
CREATE POLICY product_images_delete ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- Prevent broad policies on other buckets from bypassing product image restrictions.
CREATE POLICY product_images_insert_restriction ON storage.objects
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
  bucket_id <> 'product-images' OR (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND COALESCE((SELECT auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('Admin', 'Sales'))
  )
);
CREATE POLICY product_images_delete_restriction ON storage.objects
AS RESTRICTIVE FOR DELETE TO authenticated USING (
  bucket_id <> 'product-images' OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
CREATE POLICY product_images_update_restriction ON storage.objects
AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id <> 'product-images')
WITH CHECK (bucket_id <> 'product-images');

-- Storage deletion also requires SELECT access to the object metadata.
CREATE POLICY product_images_select ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
