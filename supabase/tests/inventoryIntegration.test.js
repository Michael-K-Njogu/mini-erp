// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'

const user = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const migrationDir = new URL('../migrations/', import.meta.url)
const readMigration = (name) => readFile(new URL(name, migrationDir), 'utf8')
const migration = await readMigration('20261113220000_inventory_integration.sql')
const databases = []

async function setup({ demo = false } = {}) {
  const db = new PGlite()
  databases.push(db)
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}',
      is_anonymous boolean DEFAULT true, created_at timestamptz DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;
  `)
  await db.exec(await readMigration('20261001000000_baseline_schema.sql'))
  await db.exec(await readMigration('20261006220000_add_customer_number.sql'))
  await db.exec(await readMigration('20261007101500_add_order_actor_audit.sql'))
  if (demo) {
    const sql = await readMigration('20261008000000_demo_mode.sql')
    await db.exec(
      sql.slice(0, sql.indexOf('DO $$\nBEGIN\n  CREATE EXTENSION IF NOT EXISTS pg_cron')),
    )
  } else {
    await db.exec(`
      CREATE POLICY profiles_test ON public.profiles FOR SELECT TO authenticated USING (true);
      DO $$ DECLARE t text; BEGIN
        FOREACH t IN ARRAY ARRAY['customers','products','inventory','stock_movements','orders','order_items']
        LOOP EXECUTE format('CREATE POLICY test_access ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        END LOOP;
      END $$;
    `)
  }
  await db.exec(await readMigration('20261008000100_api_grants.sql'))
  await db.exec(`INSERT INTO auth.users (id) VALUES ('${user}')`)
  if (!demo) {
    await db.exec(`INSERT INTO profiles (id, role) VALUES ('${user}', 'Admin')`)
  }
  return db
}

async function useUser(db, id = user) {
  await db.exec(
    `SELECT set_config('request.jwt.claim.sub', '${id}', false); SET ROLE authenticated`,
  )
}

async function rows(db, sql) {
  return (await db.query(sql)).rows
}

afterEach(async () => {
  for (const db of databases.splice(0)) await db.close()
})

describe('inventory integration migration', () => {
  it('uses the refreshed seed for new visitors and reset workspaces without changing existing data', async () => {
    const db = await setup({ demo: true })
    await db.exec(`UPDATE inventory i SET quantity_reserved = coalesce((
      SELECT sum(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = i.product_id AND o.status IN ('Pending','Processing')), 0)`)
    await db.exec(migration)
    await db.exec(await readMigration('20261113210000_product_tour.sql'))
    await db.exec(await readMigration('20261113230000_refresh_demo_seed.sql'))
    expect(await rows(db, "SELECT id FROM products WHERE sku='CEM-001'")).toHaveLength(1)
    await expect(db.exec(`SELECT public.seed_demo_data('${user}')`)).rejects.toThrow(
      'Demo workspace is not empty',
    )
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${other}')`)

    const assertSeed = async (owner) => {
      const state = await rows(
        db,
        `SELECT p.sku, p.stock_quantity, i.quantity_on_hand, i.quantity_reserved, i.reorder_level,
          coalesce((SELECT sum(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = p.id AND o.status IN ('Pending', 'Processing')), 0) AS open_qty,
          coalesce((SELECT sum(CASE WHEN m.movement_type = 'stock_in' THEN m.quantity ELSE -m.quantity END)
            FROM stock_movements m WHERE m.product_id = p.id), 0) AS movement_total
         FROM products p JOIN inventory i ON i.product_id = p.id
         WHERE p.owner_id = '${owner}' ORDER BY p.sku`,
      )
      expect(state).toHaveLength(5)
      for (const product of state) {
        expect(Number(product.stock_quantity)).toBe(Number(product.quantity_on_hand))
        expect(Number(product.quantity_reserved)).toBe(Number(product.open_qty))
        expect(Number(product.quantity_on_hand)).toBe(Number(product.movement_total))
      }
      const available = state.map((p) => ({
        available: Number(p.quantity_on_hand) - Number(p.quantity_reserved),
        reorder: Number(p.reorder_level),
      }))
      expect(available.some((p) => p.available > p.reorder)).toBe(true)
      expect(available.some((p) => p.available > 0 && p.available <= p.reorder)).toBe(true)
      expect(available.some((p) => p.available === 0)).toBe(true)
      const statuses = await rows(
        db,
        `SELECT status, total_amount, id FROM orders WHERE owner_id='${owner}'`,
      )
      expect(statuses.map((o) => o.status).sort()).toEqual([
        'Canceled',
        'Completed',
        'Draft',
        'Pending',
        'Processing',
      ])
      const totalErrors = await rows(
        db,
        `SELECT o.id FROM orders o WHERE o.owner_id='${owner}'
         AND o.total_amount <> (SELECT sum(line_total) FROM order_items WHERE order_id=o.id)`,
      )
      expect(totalErrors).toHaveLength(0)
      const movementErrors = await rows(
        db,
        `SELECT oi.id FROM order_items oi JOIN orders o ON o.id=oi.order_id
         WHERE o.owner_id='${owner}' AND o.status='Completed'
         AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.reference_id=o.id
           AND m.reference_type='order' AND m.product_id=oi.product_id
           AND m.movement_type='stock_out' AND m.quantity=oi.quantity)`,
      )
      expect(movementErrors).toHaveLength(0)
      return statuses
    }

    const orders = await assertSeed(other)
    await useUser(db, other)
    const processing = orders.find((o) => o.status === 'Processing')
    const pending = orders.find((o) => o.status === 'Pending')
    await db.exec(`UPDATE orders SET status='Completed' WHERE id='${processing.id}'`)
    await db.exec(`UPDATE orders SET status='Canceled' WHERE id='${pending.id}'`)
    const balanceErrors = await rows(
      db,
      `SELECT i.id FROM inventory i JOIN products p ON p.id=i.product_id
       WHERE i.quantity_on_hand <> p.stock_quantity OR i.quantity_reserved <>
       coalesce((SELECT sum(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id
         WHERE oi.product_id=i.product_id AND o.status IN ('Pending','Processing')), 0)`,
    )
    expect(balanceErrors).toHaveLength(0)

    await db.exec('RESET ROLE')
    await db.exec(`CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
      LANGUAGE sql STABLE AS $$ SELECT '{"is_anonymous":true}'::jsonb $$`)
    await useUser(db, user)
    await db.exec(
      `INSERT INTO product_tour_completions (user_id, completed_version) VALUES ('${user}', 1)`,
    )
    await db.exec('SELECT public.reset_demo_data_with_tour()')
    expect(await rows(db, 'SELECT * FROM product_tour_completions')).toHaveLength(0)
    await db.exec('RESET ROLE')
    await assertSeed(user)
    expect((await rows(db, `SELECT count(*) n FROM products WHERE owner_id='${other}'`))[0].n).toBe(
      5,
    )
  }, 30000)

  it('refuses to install the refreshed seed without the demo inventory integration', async () => {
    const db = await setup()
    await expect(
      db.exec(await readMigration('20261113230000_refresh_demo_seed.sql')),
    ).rejects.toThrow('requires the demo schema and inventory integration migration')
    await db.exec('ROLLBACK')
  }, 30000)

  it('seeds purged anonymous workspaces atomically and refuses to overwrite existing data', async () => {
    const db = await setup({ demo: true })
    await db.exec(`UPDATE inventory i SET quantity_reserved = coalesce((
      SELECT sum(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = i.product_id AND o.status IN ('Pending','Processing')), 0)`)
    await db.exec(migration)
    await db.exec(await readMigration('20261113210000_product_tour.sql'))
    await db.exec(await readMigration('20261113230000_refresh_demo_seed.sql'))
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${other}')`)
    const seedExisting = await readFile(
      new URL('../demo/seed_existing_workspaces.sql', import.meta.url),
      'utf8',
    )
    await expect(db.exec(seedExisting)).rejects.toThrow('Demo workspace is not empty')
    await db.exec('ROLLBACK')
    await db.exec(`
      DELETE FROM notifications;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM stock_movements;
      DELETE FROM inventory;
      DELETE FROM products;
      DELETE FROM customers;
      INSERT INTO product_tour_completions (user_id, completed_version) VALUES ('${user}', 1);
    `)
    await db.exec(`SELECT public.seed_demo_data('${other}')`)
    await expect(db.exec(seedExisting)).rejects.toThrow('Demo workspace is not empty')
    await db.exec('ROLLBACK')
    expect(await rows(db, `SELECT id FROM products WHERE owner_id='${user}'`)).toHaveLength(0)
    await db.exec(`
      DELETE FROM notifications;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM stock_movements;
      DELETE FROM inventory;
      DELETE FROM products;
      DELETE FROM customers;
    `)
    await db.exec(seedExisting)
    for (const owner of [user, other]) {
      expect(
        Number((await rows(db, `SELECT count(*) n FROM products WHERE owner_id='${owner}'`))[0].n),
      ).toBe(5)
      expect(
        Number((await rows(db, `SELECT count(*) n FROM orders WHERE owner_id='${owner}'`))[0].n),
      ).toBe(5)
    }
    expect(await rows(db, 'SELECT id FROM auth.users')).toHaveLength(2)
    expect(await rows(db, 'SELECT id FROM profiles')).toHaveLength(2)
    expect(await rows(db, 'SELECT user_id FROM product_tour_completions')).toHaveLength(1)
    await expect(db.exec(seedExisting)).rejects.toThrow('Demo workspace is not empty')
    await db.exec('ROLLBACK')
    expect(Number((await rows(db, 'SELECT count(*) n FROM products'))[0].n)).toBe(10)
  }, 30000)

  it('rejects conflicting demo data, then protects the complete order lifecycle and reset', async () => {
    const db = await setup({ demo: true })
    await expect(db.exec(migration)).rejects.toThrow('reserved balances differ')
    await db.exec('ROLLBACK')
    await db.exec(`UPDATE inventory i SET quantity_reserved = coalesce((
      SELECT sum(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = i.product_id AND o.status IN ('Pending','Processing')), 0)`)
    await db.exec(migration)
    await useUser(db)

    const customer = (await rows(db, 'SELECT id FROM customers LIMIT 1'))[0].id
    const product = (await rows(db, "SELECT id FROM products WHERE sku='CEM-002'"))[0].id
    const items = JSON.stringify([
      {
        product_id: product,
        sku: 'CEM-002',
        product_name: 'Cement',
        unit: 'bag',
        quantity: 3.5,
        unit_price: 10,
        discount: 0,
        line_total: 35,
      },
    ])
    const balance = () =>
      rows(
        db,
        `SELECT quantity_on_hand, quantity_reserved FROM inventory WHERE product_id='${product}'`,
      )
    const original = (await balance())[0]
    const order = (
      await rows(
        db,
        `SELECT * FROM public.save_order_with_items(NULL, 'ORD-TEST', '${customer}', NULL, '${items}'::jsonb, true)`,
      )
    )[0]
    expect(Number((await balance())[0].quantity_reserved)).toBe(
      Number(original.quantity_reserved) + 3.5,
    )
    await expect(
      db.exec(`UPDATE order_items SET quantity=7 WHERE order_id='${order.id}'`),
    ).rejects.toThrow('Only draft orders can be edited')
    await db.exec(
      `RESET ROLE; UPDATE profiles SET role='Sales' WHERE id='${user}'; SET ROLE authenticated`,
    )
    await db.exec(`UPDATE orders SET status='Processing' WHERE id='${order.id}'`)
    await expect(
      db.exec(`UPDATE orders SET status='Completed' WHERE id='${order.id}'`),
    ).rejects.toThrow('Order transition is not permitted')
    await db.exec(
      `RESET ROLE; UPDATE profiles SET role='Operations' WHERE id='${user}'; SET ROLE authenticated`,
    )
    await db.exec(`UPDATE orders SET status='Completed' WHERE id='${order.id}'`)
    await db.exec(
      `RESET ROLE; UPDATE profiles SET role='Admin' WHERE id='${user}'; SET ROLE authenticated`,
    )
    const completed = (await balance())[0]
    expect(Number(completed.quantity_on_hand)).toBe(Number(original.quantity_on_hand) - 3.5)
    expect(Number(completed.quantity_reserved)).toBe(Number(original.quantity_reserved))
    expect(
      Number(
        (await rows(db, `SELECT stock_quantity FROM products WHERE id='${product}'`))[0]
          .stock_quantity,
      ),
    ).toBe(Number(completed.quantity_on_hand))
    expect(
      Number(
        (
          await rows(db, `SELECT count(*) n FROM stock_movements WHERE reference_id='${order.id}'`)
        )[0].n,
      ),
    ).toBe(1)

    const count = Number((await rows(db, 'SELECT count(*) n FROM orders'))[0].n)
    await expect(
      db.exec(
        `SELECT public.save_order_with_items(NULL, 'ORD-FAIL', '${customer}', NULL, '${items.replace('3.5', '9999')}'::jsonb, true)`,
      ),
    ).rejects.toThrow('Insufficient available stock')
    expect(Number((await rows(db, 'SELECT count(*) n FROM orders'))[0].n)).toBe(count)
    const products = await rows(
      db,
      `SELECT p.id, p.sku, p.name, p.unit FROM products p
       JOIN inventory i ON i.product_id = p.id
       WHERE i.quantity_on_hand - i.quantity_reserved >= 1 ORDER BY p.id LIMIT 2`,
    )
    const firstBalance = (
      await rows(db, `SELECT quantity_reserved FROM inventory WHERE product_id='${products[0].id}'`)
    )[0].quantity_reserved
    const mixedItems = JSON.stringify(
      products.map((p, index) => ({
        product_id: p.id,
        sku: p.sku,
        product_name: p.name,
        unit: p.unit,
        quantity: index === 0 ? 0.1 : 999999,
        unit_price: 1,
        discount: 0,
        line_total: 1,
      })),
    )
    await expect(
      db.exec(
        `SELECT public.save_order_with_items(NULL, 'ORD-MULTI', '${customer}', NULL, '${mixedItems}'::jsonb, true)`,
      ),
    ).rejects.toThrow('Insufficient available stock')
    expect(
      (
        await rows(
          db,
          `SELECT quantity_reserved FROM inventory WHERE product_id='${products[0].id}'`,
        )
      )[0].quantity_reserved,
    ).toBe(firstBalance)

    const canceled = (
      await rows(
        db,
        `SELECT id FROM public.save_order_with_items(NULL, 'ORD-CANCEL', '${customer}', NULL, '${items}'::jsonb, true)`,
      )
    )[0].id
    await db.exec(`UPDATE orders SET status='Canceled' WHERE id='${canceled}'`)
    expect(Number((await balance())[0].quantity_reserved)).toBe(Number(original.quantity_reserved))

    const draft = (
      await rows(
        db,
        `SELECT id FROM public.save_order_with_items(NULL, 'ORD-DRAFT', '${customer}', 'original', '${items}'::jsonb, false)`,
      )
    )[0].id
    const draftItem = (await rows(db, `SELECT id FROM order_items WHERE order_id='${draft}'`))[0].id
    const updatedItems = JSON.stringify([
      { ...JSON.parse(items)[0], id: draftItem, quantity: 9999 },
    ])
    await expect(
      db.exec(
        `SELECT public.save_order_with_items('${draft}', NULL, '${customer}', 'changed', '${updatedItems}'::jsonb, true)`,
      ),
    ).rejects.toThrow('Insufficient available stock')
    expect(
      (await rows(db, `SELECT status, notes FROM orders WHERE id='${draft}'`))[0],
    ).toMatchObject({
      status: 'Draft',
      notes: 'original',
    })
    expect(
      Number(
        (await rows(db, `SELECT quantity FROM order_items WHERE id='${draftItem}'`))[0].quantity,
      ),
    ).toBe(3.5)
    const validItems = updatedItems.replace('9999', '2')
    await db.exec(
      `SELECT public.save_order_with_items('${draft}', NULL, '${customer}', 'changed', '${validItems}'::jsonb, true)`,
    )
    expect((await rows(db, `SELECT id FROM order_items WHERE order_id='${draft}'`))[0].id).toBe(
      draftItem,
    )
    await db.exec(`UPDATE orders SET status='Canceled' WHERE id='${draft}'`)

    const removable = (
      await rows(
        db,
        `SELECT id FROM public.save_order_with_items(NULL, 'ORD-DELETE', '${customer}', NULL, '${items}'::jsonb, false)`,
      )
    )[0].id
    await db.exec(`DELETE FROM orders WHERE id='${removable}'`)
    expect(await rows(db, `SELECT id FROM order_items WHERE order_id='${removable}'`)).toHaveLength(
      0,
    )

    await expect(
      db.exec(`UPDATE inventory SET quantity_on_hand=1 WHERE product_id='${product}'`),
    ).rejects.toThrow('permission denied')
    await expect(
      db.exec(`UPDATE products SET stock_quantity=1 WHERE id='${product}'`),
    ).rejects.toThrow('Change stock')
    await db.exec(`SELECT public.adjust_stock('${product}','stock_in',1.25,'Count',NULL)`)
    expect(
      Number(
        (await rows(db, `SELECT stock_quantity FROM products WHERE id='${product}'`))[0]
          .stock_quantity,
      ),
    ).toBe(Number((await balance())[0].quantity_on_hand))

    await db.exec('RESET ROLE')
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${other}')`)
    await useUser(db, other)
    await expect(
      db.exec(`SELECT public.adjust_stock('${product}','stock_in',1,'test',NULL)`),
    ).rejects.toThrow('not found')
    await db.exec('SELECT public.reset_demo_data()')
    const mismatch = await rows(
      db,
      `SELECT i.id FROM inventory i WHERE quantity_reserved <>
      coalesce((SELECT sum(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE oi.product_id=i.product_id AND o.status IN ('Pending','Processing')),0)`,
    )
    expect(mismatch).toHaveLength(0)
  }, 30000)

  it('works on the shared schema and blocks mismatched stock and unauthorized adjustments', async () => {
    const db = await setup()
    await db.exec(`INSERT INTO products (sku, name, category, unit, stock_quantity)
      VALUES ('OLD-001', 'Old product', 'Test', 'piece', 10)`)
    await db.exec(`INSERT INTO inventory (product_id, quantity_on_hand, quantity_reserved)
      SELECT id, 9, 0 FROM products`)
    await expect(db.exec(migration)).rejects.toThrow('product and inventory stock balances differ')
    await db.exec('ROLLBACK')
    await db.exec('UPDATE inventory SET quantity_on_hand=10')
    await db.exec(migration)
    await useUser(db)
    const product = (
      await rows(
        db,
        `INSERT INTO products (sku, name, category, unit, stock_quantity)
        VALUES ('NEW-001', 'New product', 'Test', 'ton', 2.5) RETURNING id`,
      )
    )[0].id
    expect(
      Number(
        (await rows(db, `SELECT quantity_on_hand FROM inventory WHERE product_id='${product}'`))[0]
          .quantity_on_hand,
      ),
    ).toBe(2.5)
    expect(
      (await rows(db, `SELECT reason FROM stock_movements WHERE product_id='${product}'`))[0]
        .reason,
    ).toBe('Opening stock')
    await expect(db.exec(`DELETE FROM products WHERE id='${product}'`)).rejects.toThrow(
      'Cannot delete a product with stock or reservations',
    )
    const empty = (
      await rows(
        db,
        `INSERT INTO products (sku, name, category, unit, stock_quantity)
         VALUES ('EMPTY-001', 'Empty product', 'Test', 'piece', 0) RETURNING id`,
      )
    )[0].id
    await db.exec(`DELETE FROM products WHERE id='${empty}'`)
    expect(await rows(db, `SELECT id FROM inventory WHERE product_id='${empty}'`)).toHaveLength(0)
    await db.exec('RESET ROLE')
    await db.exec(`UPDATE profiles SET role='Sales' WHERE id='${user}'`)
    await useUser(db)
    await expect(
      db.exec(`SELECT public.adjust_stock('${product}','stock_in',1,'test',NULL)`),
    ).rejects.toThrow('Not authorized')
    await expect(
      db.exec(`INSERT INTO products (sku, name, category, unit, stock_quantity)
        VALUES ('SALES-1', 'New product', 'Test', 'piece', 1)`),
    ).rejects.toThrow('Not authorized to set opening stock')
    await db.exec(`INSERT INTO products (sku, name, category, unit, stock_quantity)
      VALUES ('SALES-1', 'New product', 'Test', 'piece', 0)`)
    await db.exec('RESET ROLE')
    await db.exec(`UPDATE profiles SET role='Accounting' WHERE id='${user}'`)
    await useUser(db)
    expect(await rows(db, 'SELECT id FROM inventory')).toHaveLength(0)
    expect(await rows(db, 'SELECT id FROM stock_movements')).toHaveLength(0)
  }, 30000)
})
