// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it('enforces product image ownership, roles, demo restrictions and immutable objects', async () => {
  const db = new PGlite()
  const owner = '11111111-1111-4111-8111-111111111111'
  const other = '22222222-2222-4222-8222-222222222222'
  try {
    await db.exec(`
      CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${owner}'::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
        SELECT jsonb_build_object('is_anonymous', current_setting('test.demo', true) = 'true') $$;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1, '/') $$;
      CREATE TABLE public.products (id uuid PRIMARY KEY);
      CREATE TABLE public.profiles (id uuid, role text);
      INSERT INTO profiles VALUES ('${owner}', 'Sales');
      CREATE TABLE storage.buckets (id text, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      CREATE TABLE storage.objects (bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage, auth TO authenticated;
      GRANT SELECT ON public.profiles TO authenticated;
      GRANT ALL ON storage.objects TO authenticated;
      CREATE POLICY broad_access ON storage.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `)
    await db.exec(
      await readFile(
        new URL('../migrations/20261114000000_product_images.sql', import.meta.url),
        'utf8',
      ),
    )
    expect(
      (await db.query('SELECT file_size_limit FROM storage.buckets')).rows[0].file_size_limit,
    ).toBe(2097152)
    await db.exec(
      `SET ROLE authenticated; INSERT INTO storage.objects VALUES ('product-images', '${owner}/photo.png')`,
    )
    await expect(
      db.exec(`INSERT INTO storage.objects VALUES ('product-images', '${other}/photo.png')`),
    ).rejects.toThrow(/row-level security/)
    await db.exec("SELECT set_config('test.demo', 'true', false)")
    await expect(
      db.exec(`INSERT INTO storage.objects VALUES ('product-images', '${owner}/demo.png')`),
    ).rejects.toThrow(/row-level security/)
    await db.exec(
      "SELECT set_config('test.demo', 'false', false); RESET ROLE; UPDATE profiles SET role = 'Operations'; SET ROLE authenticated",
    )
    await expect(
      db.exec(`INSERT INTO storage.objects VALUES ('product-images', '${owner}/ops.png')`),
    ).rejects.toThrow(/row-level security/)
    await db.exec(`UPDATE storage.objects SET name = '${owner}/changed.png'`)
    expect((await db.query('SELECT name FROM storage.objects')).rows[0].name).toBe(
      `${owner}/photo.png`,
    )
    await db.exec(
      `RESET ROLE; INSERT INTO storage.objects VALUES ('product-images', '${other}/photo.png'); SET ROLE authenticated; DELETE FROM storage.objects`,
    )
    expect((await db.query('SELECT name FROM storage.objects')).rows).toEqual([
      { name: `${other}/photo.png` },
    ])
  } finally {
    await db.close()
  }
})
