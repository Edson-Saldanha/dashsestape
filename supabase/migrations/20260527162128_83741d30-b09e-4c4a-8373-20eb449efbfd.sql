DROP POLICY IF EXISTS "Public read product evaluations" ON storage.objects;

CREATE POLICY "Auth read product evaluations"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-evaluations');