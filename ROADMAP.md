# CRM Roadmap

This roadmap reflects the current Vue application and its direction as a CRM for a
building-materials business.

## Completed

### Customer Management

- [x] Create, view, edit, and delete customers
- [x] Customer detail pages with contact and delivery information
- [x] Search, filtering, sorting, and pagination
- [x] Customer types, industries, regions, and customer numbers
- [x] Customer form validation and permission checks

### Order Management

- [x] Create, view, edit, and delete orders
- [x] Link orders to customer accounts
- [x] Draft, pending, processing, completed, and canceled order states
- [x] Validated order status transitions and order timeline events
- [x] Order search, filtering, sorting, and pagination
- [x] Order numbers, totals, discounts, and customer credit calculations
- [x] Order item creation, editing, deletion, and duplicate-item merging
- [x] Order and order-item permission checks

### Product Management

- [x] Create, view, edit, and delete products
- [x] Product categories, units, SKUs, pricing, and stock quantities
- [x] Product search, filtering, sorting, and pagination
- [x] Product form validation and permission checks

### User Experience

- [x] Responsive list, table, card, and detail views
- [x] Reusable base components for forms, buttons, modals, badges, pagination,
      inputs, selects, alerts, and empty states
- [x] Loading skeletons, confirmation modals, and toast notifications
- [x] Customer account summaries and available-credit calculations
- [x] Invoice preview and browser print support
- [x] Order lifecycle timeline with completed, current, and upcoming stages
- [x] Notification dropdown with unread counts and read-state actions
- [x] Full notifications page with entity navigation and empty/error states
- [x] Login, session initialization, protected routes, and sign-out
- [x] Role-aware navigation and action-level permission checks
- [x] Prettier formatting with format and format-check scripts

### Application Foundation

- [x] Vue 3, Vite, and Vue Router application structure
- [x] Supabase client and REST API service layer
- [x] Profile lookup service and permission definitions for Admin, Sales,
      Operations, and Accounting roles
- [x] Browser mocking through MSW
- [x] Local storage service and seeded development data
- [x] Zod and Vee-Validate form validation
- [x] Vitest test tooling configured

## In Progress

- [ ] Expose invoice preview and printing through a dedicated invoice workflow
- [ ] Add automated tests for services, composables, business rules, and key forms

## Phase 1: Operations

### Dashboard and Reporting

- [ ] Customer, order, product, and revenue summary cards
- [x] Orders by status and revenue trends
- [x] Recent order and customer creation activity
- [x] Dashboard date-range filters and order CSV export
- [ ] Amount-range filters and CSV exports for other operational lists

### Invoicing and Payments

- [ ] Generate invoices from completed orders
- [ ] Download invoices as PDF
- [ ] Track invoice states: draft, sent, paid, and overdue
- [ ] Record payments and reconcile outstanding balances
- [ ] Send invoice and payment reminders

### Inventory

- [ ] Low-stock thresholds and alerts
- [ ] Stock adjustments, returns, and movement history
- [ ] Reorder suggestions and supplier details
- [ ] Prevent or warn about orders exceeding available stock

## Phase 2: CRM Intelligence

### Customers

- [ ] Customer account statements and payment history
- [ ] Lifetime value and repeat-order metrics
- [ ] Customer segmentation by type, region, and activity
- [ ] Customer notes, follow-up tasks, and reminders
- [ ] Customer import and duplicate detection

### Products and Orders

- [ ] Gross-margin and profit calculations
- [ ] Best-selling and slow-moving product reports
- [ ] Bulk order and product actions
- [ ] Order templates and one-click reorder
- [ ] Advanced saved filters and views

## Phase 3: Team and Governance

- [x] Basic authentication and session protection
- [x] Self-service profile page for display name, phone number, and profile picture
- [ ] User administration and role assignment
- [ ] Expand role-based access controls across every module and workflow
- [ ] Approval workflows for orders and credit limits
- [ ] Activity audit log showing who changed what and when
- [ ] Soft deletion and record recovery
- [ ] Configurable email and notification templates

## Phase 4: Integrations and Scale

- [ ] Customer-facing portal for order tracking and invoices
- [ ] Email and SMS order-status notifications
- [ ] Payment gateway integration
- [ ] Accounting export or integration with QuickBooks/Xero
- [ ] Supplier and delivery integrations
- [ ] API error monitoring, rate limiting, and performance improvements
- [ ] End-to-end testing and CI formatting/build checks
