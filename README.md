# Mykie's Mini ERP

This is a Mini ERP for managing the day-to-day operations of any business. It brings customer, product, and sales-order workflows together, with role-aware access, account credit calculations, and invoice previews.

The application is being built out as an operational hub. Its current workflows
are backed by Supabase, while reporting, invoicing and payments, and deeper
inventory management are part of the roadmap. The project also serves as a UI
lab: reusable controls, responsive layouts, validation, loading states, and
browser-mocked API development evolve alongside the business features.

## Features

- Customer management with account summaries and order timelines
- Product catalog with categories, units, pricing, and stock quantities
- Sales-order management, including order items, discounts, totals, and lifecycle
  transitions
- Customer credit calculations and invoice preview with browser printing
- Search, filtering, sorting, and pagination on list views
- Notifications with unread counts, read-state actions, and entity navigation
- Supabase authentication, session protection, sign-in, and sign-out
- Role-based permissions for Admin, Sales, Operations, and Accounting users
- Reusable Vue components for forms, buttons, modals, inputs, selects, badges,
  alerts, empty states, and loading skeletons
- MSW browser mocks for local development

The Mini ERP is under active development; see the roadmap for completed
functionality, current gaps, and planned modules.

## Tech Stack

- Vue 3 with `<script setup>`
- Vite
- Vue Router
- Supabase JavaScript client
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
```

Start the development server:

```bash
npm run dev
```

Vite will print the local URL, normally `http://localhost:5173`.

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
npm run build         # Create a production build in dist/
npm run preview       # Preview the production build locally
npm run format        # Format supported project files with Prettier
npm run format:check  # Check formatting without changing files
npm run test          # Run Vitest in watch mode
npm run test:run      # Run Vitest once
npm run test:ui       # Open the Vitest UI
```

The test tooling is configured, but the project does not yet contain test files.
`npm run test:run` will therefore report that no test files were found until tests
are added.

## Project Structure

```text
src/
	api/          API and Supabase clients
	business/     Business rules, calculations, transitions, and permissions
	components/   Shared UI and feature components
	composables/  Reusable Vue state and data logic
	constants/    Statuses, roles, categories, and other domain values
	layouts/      Application-wide page layouts
	mappers/      API/domain data mapping
	mocks/        MSW handlers and seeded development data
	router/       Routes and authentication/permission guards
	services/     API-facing service modules
	styles/       Shared feature styles and design variables
	utils/        Formatting, numbering, printing, and navigation helpers
	validation/   Zod validation schemas
	views/        Route-level pages
```

## Development Notes

- Keep API calls in `src/services/` and domain rules in `src/business/` rather
  than embedding them in views.
- Reuse components from `src/components/base/` before adding a new control.
- Add route permissions in `src/router/index.js` and action checks in the relevant
  feature component when introducing a protected workflow.
- Run `npm run format:check` before committing formatting-sensitive changes.
- Update [ROADMAP.md](ROADMAP.md) when a feature moves from planned to active or
  completed work.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for completed functionality, current gaps, and planned
operations, reporting, invoicing and payments, inventory, governance, and
integration work.
