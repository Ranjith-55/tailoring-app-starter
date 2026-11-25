# StitchFlow — Tailoring Studio — Phase 1

Admin & staff panel for a women's tailoring business. Built with Next.js (App Router) + Supabase (Postgres, Auth, Storage), styled with Tailwind CSS.

This document is the **Phase 1** snapshot — everything built, fixed, and deployed so far. Later phases (new features, further polish) should get their own dated section or follow-up doc rather than silently overwriting this record.

## Deployment

- **Host:** Vercel
- **Live URL (verified working):** `https://temporary-quick-bronze-z9gk3ry.vercel.app` — originally created as an anonymous temporary deployment, then claimed into a real Vercel account (that's why it didn't expire).
- **Intended URL (not live yet):** `https://stitchflow-by-ranjith.vercel.app` — renamed in intent, but the rename hasn't actually been applied in the Vercel dashboard yet (Settings → General → Project Name), so this URL currently 404s. Use the URL above until that's done.
- **Verified up to date:** every feature in this document — toasts, garment hide/restore, the login redesign, the WhatsApp updates, everything — was already saved to disk before the one and only deploy was run, and nothing has changed since. Confirmed live by loading the deployed login page and seeing the current redesigned version, not a stale one.
- **Build:** standard Next.js build, runs remotely on Vercel (no local build artifacts involved)
- **Environment variables required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (set on Vercel; safe to expose client-side, protected by Supabase Row-Level Security, not secrecy)
- **Database setup:** run `supabase/schema.sql` once in the Supabase SQL Editor (tables + RLS policies + seed garment types). See "Pending setup" below for one migration snippet that still needs running.
- **Not a data backup:** this file documents features and the database *schema* (table/column names) — it is not an export of actual customer/order records. Real data lives in Supabase only, and is identical regardless of which deployment serves the frontend.

## Roles & security

- **Owner** — full control: can edit/delete customers, manage staff, mark attendance, set salary, view reports/exports, manage garment templates, edit shop settings.
- **Staff** — day-to-day use: can add customers (not edit/delete), record measurements, manage orders and payments, view their own assigned work.
- Enforced in two layers: `ProtectedRoute` (UI-level, redirects for a clean UX) **and** Postgres Row-Level Security policies in `supabase/schema.sql` (the actual security boundary — a staff member calling the API directly is still blocked at the database).

## Pages & features

### Dashboard (`/dashboard`)
Welcome header with role, quick stats (total customers, orders in progress, orders with balance due), quick links to add a customer / view the orders board, and a table of the 5 most recent orders.

### Activity & Reminders (`/reminders`)
Cross-cutting view of what needs attention: orders due today or overdue, orders due tomorrow, and orders with an outstanding balance — each as its own panel with a live count, independent of the orders board's status columns.

### Customers (`/customers`, `/customers/new`, `/customers/[id]`, `/customers/[id]/edit`)
- Searchable/filterable list (all / has balance due / no orders yet), responsive table (desktop) → card list (mobile).
- New customer form: name, WhatsApp phone, address, first measurement set (garment type + fields from the owner-editable templates), optional photo upload.
- Detail page: contact info, notes, billed/paid/balance totals, measurement history (versioned, add new versions inline via a modal), photo gallery (private Supabase Storage bucket, signed URLs), order history, and a **Send welcome message** WhatsApp button.
- Edit/Delete restricted to Owner (UI-gated and RLS-gated).

### Measurements (`/measurements`)
Standalone measurement workspace independent of the customer page: pick or create a customer inline, see their measurements grouped by garment type with a version history. Shows a "recently added" feed when no customer is selected yet.
- **Update** edits the current version's values in place (same row, same recorded date — corrects a mistake rather than creating a new dated entry). **Locks automatically** once any order using that measurement has moved past "New" into Stitching or beyond, since the garment may already be cut/sewn to those numbers — editing at that point would silently change what's already in production. The lock shows as "🔒 Locked — in production" in place of the Update button.
- **"or record as a new version"** is always available regardless of lock state — creates a genuinely new, separate measurement row (a real remeasurement over time), which past and current orders keep referencing by their own specific version untouched.

### Orders (`/orders`, `/orders/new`, `/orders/[id]`)
- **Board view:** Kanban-style columns (New → Stitching → Ready; Delivered/Cancelled are considered "done" and hidden from the board but still reachable). Horizontal-scroll card rows on mobile/tablet, vertical columns on desktop.
- **List view:** searchable/filterable/sortable table (by newest or due date), shows overdue orders highlighted, "All statuses" hides in-progress stitching orders by default (filter to "Stitching" explicitly to see them), and each row has a **⋮ menu** to change status directly without opening the order.
- Stat tiles: active orders, due today, overdue, ready for pickup.
- New order form: customer picker, optional linked measurement version, multiple garment line-items with amounts, due date, advance payment (auto-computes payment status), staff assignment.
- Detail page: status + payment status dropdowns, due date, staff assignment, payment history, line items, the measurement snapshot used, and a WhatsApp notify button whose message adapts to status (ready / delivered–thank-you / generic update).
- **Once an order is Delivered**, the status control (both on the detail page and the list's ⋮ menu) no longer offers the normal 5 statuses — the only option is **Issue / Rework**, which asks for the new delivery date and a note on what the issue was, then reopens the order into Stitching and permanently marks it (`orders.is_rework` + `orders.rework_note`). That mark is a standing record, not a transient in-progress flag — it does **not** clear when status changes again, so an amber **"Issue / Rework"** badge (same wording everywhere) keeps showing alongside its real current status in every view — board card, list row, detail page — even after it's Ready or Delivered again. The issue description itself is shown directly on the **order detail page** in its own callout, in addition to being logged to `order_status_history` for a full audit trail. On the board it stays grouped in the same Stitching column while actively being redone (not a separate column) and sorts to the top of it. It also gets its own entry in the List view's status filter dropdown.
- Delete (Owner-only).

### Payments (`/payments`)
Record advance / balance / refund payments against a customer and (optionally) a specific order — auto-updates that order's paid amount and payment status. Recent payments table.

### Staff (`/staff`, `/staff/new`, `/staff/[id]`) — Owner-only
- List with search, each member's active task count and today's attendance status.
- Add staff (creates a real Supabase Auth user + `staff` row via an Edge Function, or manually per the README if that function isn't deployed).
- Detail page: assigned orders, recent attendance, salary history, and an activate/deactivate toggle (not available for the owner account itself).

### Attendance (`/attendance`) — Owner-only
Owner marks each active staff member present / absent / half-day / leave for a chosen date; monthly grid view across all staff. Staff never self-mark.

### Salary (`/salary`) — Owner-only
Per staff member, per pay period: amount due vs. amount paid (auto-marks paid date when an amount is entered), balance shown live, plus a running history table. Never visible to staff, not even their own.

### Expenses (`/expenses`) — Owner-only
Log shop expenses by category (rent, materials, utilities, wages, other) with date and description; running "this month" total and a recent expenses table.

### Reports (`/reports`) — Owner-only
- 6-month collections bar chart, busiest garment types, orders-per-month table.
- Monthly accounts summary: income, expenses, salary paid, net.
- **Excel export** (`.xlsx`, multi-sheet: Summary / Orders / Payments / Expenses / Salary) for any selected month — plain CSV was explicitly ruled out.

### Garment templates (`/templates`, `/templates/[key]`) — Owner-only
Replaces a hard-coded garment/measurement-field list with an editable one:
- Add a garment type with a display name and comma-separated measurement fields (or leave blank for a free-form notes type).
- Edit a template's label/fields, with a live preview of what staff will see.
- **Smart delete:** if a type has never been used in any measurement or order, it's deleted outright. If it *has* been used, it's hidden instead (`is_active = false`) — existing records keep their data untouched, but the type disappears from pickers for new measurements/orders. Hidden types can be restored from their detail page. The templates list shows an Active/Hidden badge per row.

### Settings (`/settings`)
- Personal profile (name, phone) — everyone.
- Shop profile (name, phone, address, GST number) — Owner-only. Shop name here feeds the WhatsApp message signature app-wide.
- Payment & invoicing terms text — Owner-only.
- Data management: CSV export (orders / payments / expenses) by date range — Owner-only.

### WhatsApp notifications (site-wide)
Free "click to chat" links (`wa.me`) — no account, no API cost, no automation; a button opens WhatsApp with a message pre-filled, a human still taps Send. Every message is signed with the shop's name (from Shop Profile, defaults to "Sree Designer"). Templates:
- **Welcome** — sent from a customer's detail page.
- **Order ready for pickup.**
- **Order delivered** — thank-you note (replaces the generic status message once an order is marked delivered).
- **Generic status update** — any other status change.
- **Payment received** — template exists in code, not yet wired to a button anywhere.
- *(A paid Meta Cloud API integration for fully automated sending, with a fixed sender number, was evaluated and deliberately deferred — pricing removed its free tier as of Oct 2026, not worth it at this shop's volume.)*

### Global UI
- **Toast notifications** — every save/create/update/delete across the whole app shows a green success or red failure toast (top-right, auto-dismiss, click to dismiss early), replacing native `alert()` popups everywhere.
- **Sidebar** (desktop) / **hamburger drawer** (mobile) navigation, grouped by Workspace / People & Finance / Business, with owner-only items hidden entirely from staff.
- **Topbar** (desktop/tablet): page title, live date, quick customer search (press Enter), notifications bell, and an account dropdown showing your name + role (Owner/Staff) with Log out.
- **Login screen:** redesigned — animated gradient split-screen panel with drifting blurred shapes and a feature list on desktop, clean centered card with staggered entrance animation on mobile/tablet, password show/hide toggle.

## Data model (Supabase Postgres tables)

`staff`, `customers`, `measurements`, `customer_photos`, `orders`, `order_items`, `order_status_history`, `payments`, `expenses`, `staff_attendance`, `staff_salary`, `garment_templates`, `shop_profile` — every table has Row-Level Security enabled with owner/staff-specific policies. Human-friendly `customer_code` / `order_number` exist alongside UUID primary keys.

## Pending setup / known gaps

- ~~Run `garment_templates.is_active` migration~~ — **done**, applied directly to the live database via a linked Supabase CLI session.
- ~~Run `order_status_history.note` migration~~ — **done**, applied the same way. Both are tracked as a real migration file: `supabase/migrations/20260825130128_pending_columns.sql`.
- **Deployment URL rename** not yet applied — currently redirects/serves from the auto-generated `temporary-*.vercel.app` domain until renamed in the Vercel dashboard.
- **WhatsApp sender number:** to have all outgoing messages appear to come from a specific number (e.g. `9659470837`), log into WhatsApp/WhatsApp Web with that number on whichever device staff use to click the notify buttons — this is a device setting, not something the app can control with the free click-to-chat method.
- `paymentReceived` WhatsApp template exists in `lib/whatsapp.js` but isn't wired to any button yet.
- This project folder is not currently a git repository — no version history or GitHub remote is set up.
