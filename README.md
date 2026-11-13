# Mykie's Mini ERP

This is a Mini ERP for managing the day-to-day operations of any business. It brings customer, product, and sales-order workflows together, with role-aware access, account credit calculations, and invoice previews.

Try the [live demo](https://mikes-mini-erp-demo.netlify.app/).

The application is being built out as an operational hub. Its current workflows
are backed by Supabase, while reporting, invoicing and payments, and deeper
inventory management are part of the roadmap. The project also serves as a UI
lab: reusable controls, responsive layouts, validation, loading states, and
browser-mocked API development evolve alongside the business features.

## Features

- Customer management with auto-generated customer numbers (`CUST-YYMMDD-####`),
  tabbed profiles (Overview, Orders, Credit & account), and avatar initials
- Product catalog with categories, units, pricing, image placeholders, and a
  redesigned product detail page
- Inventory overview and detail pages with stock movement history and stock
  adjustments
- Sales-order management, including order items, discounts, totals, and lifecycle
  transitions (Draft, Pending, Processing, Completed, Canceled)
- Order detail page with a customer strip, itemised totals, and an order timeline
  showing who performed each stage
- Dashboard with a personalised "Welcome Back" greeting
- Customer credit calculations and invoice preview with browser printing
- Chart.js dashboard visualizations for completed sales, order status, open
  orders, and stock health, with text alternatives and responsive layouts
- Dashboard date presets and custom ranges (up to 366 local calendar days),
  comparisons with the preceding equal-length period, recent order and customer
  creations, top customers, and CSV export of orders created in the range
- Search, filtering, sorting, and pagination on list views
- Notifications with unread counts, read-state actions, and entity navigation
- Supabase authentication, session protection, sign-in, and sign-out
- Self-service display name, phone number, and private profile picture editing;
  email and role remain read-only
- Role-based permissions for Admin, Sales, Operations, and Accounting users
- Reusable Vue components for forms, buttons, modals, inputs, selects, badges,
  alerts, empty states, and layout-matched loading skeletons for tables and
  detail pages
- Mobile navigation drawer and responsive shared forms and layouts
- MSW browser mocks for local development

The Mini ERP is under active development; see the roadmap for completed
functionality, current gaps, and planned modules.

Dashboard sales and top customers use orders currently marked Completed and
completed during the selected range. Order counts, status breakdown, activity,
and CSV exports use creation dates; open orders and stock health are current
snapshots. The activity feed is not an audit log. Data is subject to the
signed-in user's permissions and Supabase row-level policies. Dashboard reads
are paginated, not transactionally consistent snapshots: concurrent changes
may require refreshing the dashboard.

## Tech Stack

- Vue 3 with `<script setup>`
- Vite
- Vue Router
- Supabase JavaScript client
- Chart.js and vue-chartjs
- Vee-Validate and Zod
- Mock Service Worker (MSW)
- Vitest and Vue Test Utils
- Prettier

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project for authenticated and live API development

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local `.env` file in the project root. Environment files are ignored by
Git, so credentials should remain local:

```env
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_USE_MSW=false
VITE_ENABLE_DEMO=false
```

Start the development server:

```bash
npm run dev
```

Vite will print the local URL, normally `http://localhost:5173`.

## Public Demo Mode

The app can run as a public demo where visitors click **Try the demo** on the login
page instead of signing in. This uses Supabase anonymous sign-in, so every visitor
gets a private, pre-seeded workspace with full CRUD access.

1. Create a **separate** Supabase project for the demo (never reuse production).
2. Enable **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
3. Apply every file in `supabase/migrations/` in order (SQL editor or
   `supabase db push`). `20261001000000_baseline_schema.sql` and
   `20261008000000_demo_mode.sql` and `20261113230000_refresh_demo_seed.sql`
   are for the demo project only.
4. Put the demo project's URL and anon key in `.env.demo` (git-ignored) with
   `VITE_ENABLE_DEMO=true`, then run `npm run dev:demo`. Plain `npm run dev` keeps
   using `.env`, so you can switch between the main and demo projects. On the
   hosting provider, set the same variables.

The demo migration adds:

- `owner_id` columns with row level security, so visitors only see their own data
- a sign-up trigger that creates an Admin profile and seeds sample customers,
  products, inventory, orders, and notifications
- `reset_demo_data()` (called by the banner's transactional workspace and tour reset)
- per-user row caps and an hourly `pg_cron` job that deletes anonymous users and
  their data after 24 hours
- a size- and type-restricted `customer-images` storage bucket

Customer image uploads are disabled for anonymous demo accounts because resetting
or expiring a demo removes database records but not storage objects. Existing
objects in the public `customer-images` bucket are not removed by this change;
an administrator must review and remove any orphaned images through the Supabase
Storage API. Customer creation still works without an image.
For other accounts, if image upload or association fails after a customer is
created, the app reports the partial save and directs the user to check the
existing customer before retrying. An uncertain image update may leave an
unreferenced object that requires administrator cleanup through the Storage API.

`netlify.toml` configures the Netlify build and rewrites all routes to `index.html`
so deep links work. Vite embeds `VITE_*` values at build time, so each Netlify site
targets one Supabase project: create one site with the demo project's variables
(`VITE_ENABLE_DEMO=true`) and, if wanted, a second site with the main project's.

## Product Tour

The product tour opens automatically for accounts that have not completed or
skipped the current tour, including existing users. Completion is stored per
account, so it follows users across devices. The help button in the header
replays the tour, and steps reflect the navigation available to the user's role.
In an anonymous demo, the tour starts on the first visit and **Reset data**
clears completion together with the workspace, so the tour starts again after
the reset. If completion cannot be loaded or saved, the app reports the error;
users can retry or close without saving.

Apply `20261113210000_product_tour.sql` to both production and demo databases
before deploying this version of the app. The demo must also have the demo-mode
migration: the new reset RPC calls its existing `reset_demo_data()` function.

## Local Mocking

Set `VITE_USE_MSW=true` while running the development server to start the MSW
browser worker:

```env
VITE_USE_MSW=true
```

This is useful when developing UI flows without a running API. Mock support is
incremental, so use `VITE_USE_MSW=false` when you need the complete Supabase/API
integration. The service worker file in `public/mockServiceWorker.js` is generated
by MSW and is intentionally tracked in the repository.

## Available Commands

```bash
npm run dev           # Start the Vite development server
npm run dev:demo      # Start the dev server against the demo project (.env.demo)
npm run build:demo    # Production build using .env.demo
npm run build         # Create a production build in dist/
npm run preview       # Preview the production build locally
npm run format        # Format supported project files with Prettier
npm run format:check  # Check formatting without changing files
npm run test          # Run Vitest in watch mode
npm run test:run      # Run Vitest once
npm run test:ui       # Open the Vitest UI
```

The test suite includes dashboard calculations, charts, and responsive navigation tests.
Run `npm run test:run` to execute it once.

The app currently requires a network connection for its business workflows.
Offline data storage, synchronization, and conflict resolution are not yet
implemented.

## Project Structure

```text
src/
	api/          API and Supabase clients
	business/     Business rules, calculations, transitions, and permissions
	components/   Shared UI (base/) and feature components (customers, dashboard,
	              inventory, invoices, notifications, order-items, orders,
	              products, toast, user)
	composables/  Reusable Vue state and data logic
	config/       Navigation configuration
	constants/    Statuses, roles, permissions, stock movement types, and other
	              domain values
	layouts/      Application-wide page layouts
	mappers/      API/domain data mapping
	mocks/        MSW handlers and seeded development data
	router/       Routes and authentication/permission guards
	services/     API-facing service modules
	styles/       Shared feature styles and design variables
	utils/        Formatting, order/customer numbering, printing, and navigation helpers
	validation/   Zod validation schemas
	views/        Route-level pages
supabase/
	migrations/   SQL migrations for the baseline schema, demo mode, and
	              subsequent database changes
```

## Database Migrations

SQL migrations live in `supabase/migrations/`. For a new, empty project, start
with the baseline schema, then apply the remaining migrations in timestamp order.
The demo-mode migration is only for a dedicated demo project; do not apply it to
production or a project with existing business data. For an existing project,
do not apply the baseline schema; review and apply only the migrations needed for
its current schema. You can apply SQL through the Supabase SQL Editor or use
`supabase db push` when the local Supabase CLI project is linked to the intended
remote project.

Migration files, in timestamp order:

- `20261001000000_baseline_schema.sql`: creates the initial application tables
  and policies for a new, empty project. Do not run it against a project whose
  tables already exist.
- `20261006220000_add_customer_number.sql`: adds a unique `customer_number`
  column to `customers`.
- `20261007101500_add_order_actor_audit.sql`: adds order actor-audit columns and
  a trigger that records the acting user.
- `20261008000000_demo_mode.sql`: configures isolated anonymous demo workspaces,
  row-level security, sample-data provisioning, cleanup, and the demo storage
  bucket. Apply only to the separate demo project.
- `20261008000100_api_grants.sql`: grants the Data API table privileges used by
  the application; row-level security still controls accessible rows.
- `20261109200000_user_profiles.sql`: adds profile fields, self-service access
  controls, a private profile-image bucket, and profile-based order audit names.
  Review existing grants, RLS policies, and triggers before applying it to an
  existing project. It revokes profile update grants for the API roles and
  permits users to update only their own name, phone number, and avatar path.
- `20261109210000_provision_user_profiles.sql`: provisions a profile with the
  `Sales` role for newly created non-anonymous Auth users. It leaves existing
  users untouched, preserves an existing profile, and does not trust role
  values in user metadata. Review existing `auth.users` triggers first; the
  migration stops if it finds an unrecognized INSERT trigger. The known demo
  provisioning trigger remains responsible for demo profiles and seed data.
  New-user provisioning is part of the Auth insert transaction: a database
  error creating the profile will prevent the user from being created. Any
  enabled public sign-up can therefore create a `Sales` profile; configure
  Supabase Auth sign-up settings accordingly.
- `20261113200000_restrict_demo_customer_images.sql`: prevents anonymous demo
  accounts from uploading or replacing customer images, including through other
  permissive storage policies. Apply it to the demo project to enforce this rule.
- `20261113210000_product_tour.sql`: stores tour completion per user with row-level
  security and provides a transactional demo workspace and tour reset. Apply it
  to both production and demo projects before deploying the application.
- `20261113220000_inventory_integration.sql`: connects product stock, inventory,
  adjustments and order transitions. Apply it to both projects during a
  maintenance window, before deploying the matching application. The old and
  new applications are not both compatible with this migration: order creation
  changes to a transactional RPC. Review existing production functions,
  triggers, grants and RLS policies before applying it.
- `20261113230000_refresh_demo_seed.sql`: replaces the sample seed for new
  demo visitors and demo resets. Apply only to the demo project, after the
  inventory integration migration. It does not modify existing workspaces.

### Inventory migration preflight

Back up each database and review these read-only queries before applying the
inventory migration. The migration locks the relevant tables and rolls back if
product and inventory balances or owners disagree, existing quantities are
invalid, or reservations do not match pending and processing orders. It never
chooses a winner for conflicting data. Investigate and explicitly reconcile
discrepancies before retrying; do not blindly replace balances. Completed orders
are treated as historical and are not deducted again.

```sql
-- Existing product/inventory conflicts; owner_id is present only in demo.
SELECT p.id, p.sku, p.stock_quantity, i.quantity_on_hand,
       to_jsonb(p)->>'owner_id' AS product_owner,
       to_jsonb(i)->>'owner_id' AS inventory_owner
FROM public.products p JOIN public.inventory i ON i.product_id = p.id
WHERE p.stock_quantity IS DISTINCT FROM i.quantity_on_hand
   OR to_jsonb(p)->>'owner_id' IS DISTINCT FROM to_jsonb(i)->>'owner_id';

-- Existing reservations versus the quantities on open orders.
SELECT p.id, p.sku, i.quantity_on_hand, i.quantity_reserved,
       coalesce(r.order_reserved, 0) AS order_reserved
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id
LEFT JOIN (
  SELECT oi.product_id, sum(oi.quantity) AS order_reserved
  FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status IN ('Pending', 'Processing')
  GROUP BY oi.product_id
) r ON r.product_id = p.id
WHERE coalesce(i.quantity_reserved, 0) <> coalesce(r.order_reserved, 0);

-- Invalid balances and open-order quantities require individual review.
SELECT id, product_id, quantity_on_hand, quantity_reserved
FROM public.inventory
WHERE quantity_on_hand IS NULL OR quantity_reserved IS NULL
   OR quantity_on_hand < 0 OR quantity_reserved < 0
   OR quantity_reserved > quantity_on_hand
   OR quantity_on_hand IN ('NaN'::numeric, 'Infinity'::numeric)
   OR quantity_reserved IN ('NaN'::numeric, 'Infinity'::numeric);

SELECT o.id AS order_id, oi.id AS item_id, oi.product_id, oi.quantity
FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
WHERE o.status IN ('Pending', 'Processing')
  AND (oi.quantity IS NULL OR oi.quantity <= 0
       OR oi.quantity IN ('NaN'::numeric, 'Infinity'::numeric));

-- Cross-owner open order items are invalid in the isolated demo.
SELECT o.id AS order_id, oi.id AS item_id, p.id AS product_id,
       to_jsonb(o)->>'owner_id' AS order_owner,
       to_jsonb(p)->>'owner_id' AS product_owner
FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
JOIN public.products p ON p.id = oi.product_id
WHERE o.status IN ('Pending', 'Processing')
  AND to_jsonb(o)->>'owner_id' IS DISTINCT FROM to_jsonb(p)->>'owner_id';

-- Products for which the migration would create an inventory record.
SELECT p.id, p.sku, p.stock_quantity
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id
WHERE i.id IS NULL;
```

In particular, existing demo workspaces may contain illustrative reservations
that do not match their seeded orders, so they can fail preflight. Existing demo
data is not automatically reset. The refreshed demo seed contains healthy, low
and out-of-stock products, all five order states, and movement histories that
reconcile with stock on hand. Reservations match open orders.

After both inventory and demo-seed migrations are applied, new demo visitors
are seeded automatically. Existing visitors can use **Reset demo** to replace
their workspace and reset their tour progress. To seed all existing anonymous
accounts after a complete workspace-data purge, an administrator can instead run
`supabase/demo/seed_existing_workspaces.sql` in the confirmed demo project. It
does not touch Auth users, profiles, tour progress or Storage objects. It fails
and rolls back if any anonymous workspace is not empty or lacks a profile; it
never silently overwrites data. Pause demo access while applying the migrations
and seeding so new workspaces cannot be created between purge and migration.

Inventory on hand is the stock source of truth; `products.stock_quantity` is
kept in sync for existing product displays. New products get an inventory record
and an opening movement when stock is supplied. Subsequent changes must use
stock adjustments; product editing cannot change the balance. Only Admin and
Operations can set a nonzero opening balance. Admin and
Operations can adjust stock, while Admin, Sales and Operations can view it.
Posting reserves available stock, cancellation releases the reservation, and
completion deducts it and records a movement. Insufficient stock blocks posting.
Fractional quantities are supported. A product with stock or movement history
cannot be deleted. Low-stock alert configuration and returns remain future work.

For existing users without profiles, an administrator must insert a profile
using the Auth user's UUID as `profiles.id` and an explicitly chosen role.
If a profile exists but is still unavailable, inspect the SELECT grants and RLS
policies as well. Profile photos are readable by authenticated users through
one-hour signed URLs, and upload/delete access is
limited to the owner's folder. JPEG, PNG, and WebP files are limited to 2 MB.
Anonymous demo accounts can edit their name and phone number but cannot upload
photos: their automatic database cleanup cannot delete storage objects. Replaced
photos are removed after the profile update; a failed or uncertain upload/update
can leave an unreferenced object that an administrator must clean up through the
Supabase Storage API. Profile updates use `updated_at` to detect conflicting
edits; reload the profile and reapply changes if a conflict occurs. The migration
does not rewrite historical order audit names.

Customer numbers are generated in `src/utils/customerNumber.js` when a customer is
created.

## Development Notes

- Keep API calls in `src/services/` and domain rules in `src/business/` rather
  than embedding them in views.
- Reuse components from `src/components/base/` before adding a new control.
- The shared foundations in `src/styles/variables.css` map to the
  [DDS Design System](https://github.com/DDS-UX-Design/dds-design-system):
  semantic colours, typography, spacing, radius, and button tokens. The app's
  Vue controls follow its documented button, form-field, status-badge, and
  reduced-motion skeleton patterns.
- Add route permissions in `src/router/index.js` and action checks in the relevant
  feature component when introducing a protected workflow.
- Run `npm run format:check` before committing formatting-sensitive changes.
- Update [ROADMAP.md](ROADMAP.md) when a feature moves from planned to active or
  completed work.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for completed functionality, current gaps, and planned
operations, reporting, invoicing and payments, inventory, governance, and
integration work.
