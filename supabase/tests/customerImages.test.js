// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it.each([true, false])(
  'matches customer image paths with owner_id present: %s',
  async (hasOwner) => {
    const db = new PGlite()
    const owner = '11111111-1111-4111-8111-111111111111'
    const ownCustomer = '22222222-2222-4222-8222-222222222222'
    const otherCustomer = '33333333-3333-4333-8333-333333333333'
    try {
      await db.exec(`
      CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${owner}'::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
        SELECT jsonb_build_object('is_anonymous', current_setting('test.demo', true) = 'true') $$;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1, '/') $$;
      CREATE TABLE public.profiles (id uuid, role text);
      INSERT INTO profiles VALUES ('${owner}', 'Sales');
      GRANT SELECT ON public.profiles TO authenticated;
      CREATE TABLE public.customers (id uuid, owner_id uuid, name text);
      INSERT INTO customers VALUES
        ('${ownCustomer}', '${owner}', 'Acme Hardware'),
        ('${otherCustomer}', '${otherCustomer}', 'Other Customer');
      ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
      CREATE POLICY customers_owner ON customers FOR SELECT TO authenticated USING (owner_id = auth.uid());
      CREATE TABLE storage.objects (bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA storage, auth TO authenticated;
      GRANT SELECT ON public.customers TO authenticated;
      GRANT ALL ON storage.objects TO authenticated;
    `)
      const readMigration = (name) =>
        readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8')
      // Reproduce the original policy with the same name collision.
      await db.exec(`CREATE POLICY customer_images_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
      bucket_id = 'customer-images' AND EXISTS (SELECT 1 FROM customers c
        WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid()));
      SET ROLE authenticated;`)
      const insert = `INSERT INTO storage.objects VALUES ('customer-images', '${ownCustomer}/logo-test.png')`
      await expect(db.exec(insert)).rejects.toThrow(/row-level security/)
      await db.exec('RESET ROLE')
      if (!hasOwner) {
        await db.exec(`DROP POLICY customers_owner ON customers;
        DROP POLICY customer_images_insert ON storage.objects;
        ALTER TABLE customers DROP COLUMN owner_id;
        CREATE POLICY customers_visible ON customers FOR SELECT TO authenticated USING (id = '${ownCustomer}');`)
      }
      await db.exec(await readMigration('20261113200000_restrict_demo_customer_images.sql'))
      await db.exec(await readMigration('20261114010000_fix_customer_image_policies.sql'))
      // Safe to rerun after a previous SQL Editor attempt.
      await db.exec(await readMigration('20261114010000_fix_customer_image_policies.sql'))
      await db.exec('SET ROLE authenticated')
      await db.exec(insert)
      expect((await db.query('SELECT * FROM storage.objects')).rows).toHaveLength(1)
      await expect(
        db.exec(
          `INSERT INTO storage.objects VALUES ('customer-images', '${otherCustomer}/logo.png')`,
        ),
      ).rejects.toThrow(/row-level security/)
      await expect(
        db.exec(`INSERT INTO storage.objects VALUES ('customer-images', 'missing/logo.png')`),
      ).rejects.toThrow(/row-level security/)
      await db.exec("SELECT set_config('test.demo', 'true', false)")
      await expect(db.exec(insert)).rejects.toThrow(/row-level security/)
      await db.exec('DELETE FROM storage.objects')
      expect((await db.query('SELECT * FROM storage.objects')).rows).toHaveLength(0)
    } finally {
      await db.close()
    }
  },
)
