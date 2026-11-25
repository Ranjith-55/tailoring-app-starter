# Tailoring Studio — Admin Panel Structure & Plan

A working document to agree on scope before we build. Nothing here is code yet —
review it, tell me what to change, and we'll implement it step by step (one
section at a time), not all at once.

## 1. Who uses this and how

- **Owner (you / your mom)** — full control: customers, measurements, orders,
  payments, staff, attendance, salary, reports/export, settings.
- **Staff** — day-to-day shop floor use: add customers, record measurements,
  update order status/payments, send WhatsApp alerts.
- Runs on **tablet, mobile, and laptop** — so every page needs to work as a
  touch-friendly single column on phone/tablet and a fuller layout on laptop.
  (The current app already does this responsively; we'll keep that pattern.)

## 2. Permissions matrix

| Action | Staff | Owner |
|---|---|---|
| View customers, orders, measurements | ✅ | ✅ |
| Add customer | ✅ | ✅ |
| Edit / delete customer | ❌ | ✅ |
| Add a measurement set | ✅ | ✅ |
| Edit / delete a measurement set | ❌ | ✅ |
| Create orders, update status/payment | ✅ | ✅ |
| Delete an order | ❌ | ✅ |
| Send WhatsApp alerts | ✅ | ✅ |
| Mark staff attendance | ❌ (owner marks for everyone) | ✅ |
| View/enter staff salary | ❌ | ✅ |
| Manage staff accounts (add/deactivate) | ❌ | ✅ |
| Manage measurement templates (which fields exist per garment) | ❌ | ✅ |
| Export monthly reports | ❌ | ✅ |

This matches what's already enforced today for customers/orders/measurements
(database-level Row-Level Security, not just hidden buttons) — attendance,
salary, and exports are new and will get the same treatment.

**Confirmed:** owner marks attendance for all staff (no staff self clock-in).
Salary is owner-only, full stop — staff never see salary data, even their own.

## 3. App structure (left nav / sections)

```
Dashboard          — snapshot: customers, orders in progress, payments due,
                      today's attendance, this month's revenue so far

Customers          — list, search, add
  └ Customer detail  — profile, ALL measurement sets over time (not just one —
                        a customer can have a blouse set, a lehenga set, a
                        chudidhar set, etc., each addable independently and
                        kept as history when measurements change), photos,
                        order history, payment summary
  └ Edit customer     (owner only)

Orders             — Kanban board by status (received → cutting → stitching →
                      ready → delivered), due dates, payment status,
                      WhatsApp notify button
  └ New order         (currently missing — will add: pick customer + which
                        measurement set, garment description, amount, due date)

Measurement        — owner-only: define garment types and which fields each
templates            one asks for (today this is hard-coded in the code; you'd
                      be able to add e.g. "kurta" or change fields yourself)

Staff              — list, add/deactivate (existing)
  └ Attendance        — daily present/absent/half-day per staff member,
                        monthly calendar view
  └ Salary            — monthly salary entries per staff (base pay, advance
                        deducted, bonus, net paid, date paid), history

Reports & Export   — monthly totals (revenue, orders count, busiest garment
                      types) + a "Export month" button that downloads a
                      spreadsheet (CSV) of that month's orders/payments
                      (and optionally attendance/salary)
```

## 4. Data model additions needed

Everything below is **new** on top of what already exists
(`customers`, `measurements`, `customer_photos`, `orders`,
`order_status_history`, `staff`):

- **`garment_templates`** — replaces the hard-coded field list in
  `MeasurementForm.js` so the owner can manage garment types and their
  measurement fields from the app instead of editing code.
- **`staff_attendance`** — one row per staff member per day: present /
  absent / half-day, who marked it, when.
- **`staff_salary`** — one row per staff member per month: base amount,
  deductions/advance, bonus, net paid, paid date, notes.
- **No separate payments log** — sticking with the existing running totals
  on each order (`total_amount` / `amount_paid`). Simpler, and confirmed as
  enough for now.

Multiple measurement sets per customer, staff add-only / owner edit-delete
for customers, and WhatsApp click-to-chat are **already built** — no schema
change needed there, just some UI gaps to close (see below).

## 5. Gaps in the current app to close along the way

- No way to add a *new* measurement set to an *existing* customer — today
  measurements can only be entered when the customer is first created.
- No "add order" screen at all — the orders board can only update orders
  that already exist.
- Orders have a `due_date` column in the database already, but it's never
  shown, set, or sorted on in the UI.
- Garment measurement fields are hard-coded per type (blouse, chudidhar,
  lehenga, saree fall, custom) rather than owner-editable.
- Errors/confirmations use the browser's plain `alert()` / `confirm()`
  popups instead of in-app toasts/dialogs.

## 6. Suggested build order

1. Add-a-measurement-set flow on the customer detail page (small, high value)
2. New-order screen + due date field/sorting on the orders board
3. Staff attendance
4. Staff salary
5. Measurement templates (owner-configurable garment fields)
6. Reports page + monthly export
7. Visual polish pass (palette/components) across whichever pages are done —
   this was the piece we started earlier and can resume once the structure
   is settled, or interleave per page as we go.

## 7. Decisions confirmed

1. Attendance: **owner marks it for everyone**, no staff self clock-in.
2. Payments: **no separate log** — keep the running total on each order.
3. Salary: **owner-only, full stop** — staff never see it.
4. Export: **a real Excel spreadsheet or PDF**, not plain CSV. Excel (.xlsx)
   is the more useful default (numbers stay editable/summable for
   accounting) — say the word if you'd rather have PDF, or both.

## 8. Expanded scope — adopting the "StitchFlow" reference structure

You shared screenshots of a more built-out reference admin panel (same
indigo/purple + sidebar direction we'd already picked — good sign) and asked
to adopt its full structure, not just its look. That adds real new modules
on top of everything above. Capturing the additions here, with the calls
I'm making by default where the reference was ambiguous — correct any of
these and the plan updates:

### New nav structure
```
Workspace         — Dashboard, Customers, Measurements (now standalone), Orders, Production
People & Finance  — Staff, Attendance, Salary, Payments, Expenses, Accounts
```

### What's new, and the default decisions behind each
- **Standalone Measurements page** — pick a customer, tab between their
  garment types, see the *current* measurement set with a "View history"
  drill-down into older versions. No schema change needed — `measurements`
  already stores one row per recording; "current" = latest row per garment
  type, "history" = the rest. Builds on the add-measurement flow already
  shipped on the customer detail page.
- **Production tracking** — the reference uses a more granular pipeline
  than our current 5-status board. Default: extend `orders.status` to
  `received → cutting → stitching → embroidery → trial_alteration →
  finishing → ready → delivered`, and make "Production" a view over that
  same order data (grouped by stage, with progress bars) rather than a
  second source of truth.
- **Payments ledger** — this reverses the earlier decision to skip it.
  Adding a `payments` table (order, amount, method, who received it, when)
  instead of only the running total on each order — needed for the
  "collections this month" figures the reference dashboard shows anyway.
- **Expenses** — brand new: a simple expense log (date, category, amount,
  note). Default categories: rent, materials, utilities, wages, other.
- **Accounts** — defaulting to folding this into the Reports & Export page
  already planned rather than a separate page, since it's the same "money
  in vs money out" data. Say so if you want it standalone instead.
- **Staff "tasks" on the dashboard** (e.g. "Lakshmi — 6 tasks") — default:
  this means *active orders currently assigned to that staff member*, not a
  separate task-management feature. Needs one new column
  (`orders.assigned_to`), not a new module. Flag me if you actually want
  real task assignment/checklists beyond "which orders is this person
  working on."

### Unaffected — still stands from §7
Roles/permissions, owner-only attendance marking, owner-only salary,
Excel/PDF export.

## 9. Superseding spec — full StitchFlow documentation (2026-08-21)

You provided the complete StitchFlow project documentation from a separate
planning conversation — a precise data model and phased roadmap. This is
now the authoritative spec, superseding the guesses in §8 that were based
on the screenshots alone.

**Important:** we keep building in *this* codebase — Next.js + Supabase,
already connected to a real database with working auth and RLS. The
StitchFlow doc describes a separate Vite/React prototype (localStorage
only, not yet on Supabase — living at `E:\project 1\Sree Designer\...` on
what looks like a different machine). We're adopting its *spec*, not its
code — this app is already ahead of that prototype (Phase 1, DB connection,
is done here).

### What this corrects from §8's guesses
- **Order status is simpler than the screenshot suggested:**
  `New → Stitching → Ready → Delivered` (+ `Cancelled`) — not the 8-stage
  Cutting/Embroidery/Trial-Alteration/Finishing pipeline guessed at before.
  Dropping that idea.
- **"Accounts"** = income (payments) − expenses − salary paid, as guessed —
  still folding into Reports rather than a separate page unless told
  otherwise.

### New precision this doc adds
- **Human-friendly IDs** — `customer_code` (`CUST-0001`) and `order_number`
  (`ORD-0001`) auto-generated, alongside the internal UUIDs already in use.
- **Orders reference a specific measurement version** (`measurement_id`) —
  the version active when the order was placed. Matters for the new-order
  screen (next task): it needs a "pick which saved measurement to use"
  step, not just a garment description field.
- **Payments** get a `type` (advance / balance / refund) alongside method
  and amount.
- **Staff have a job role** (tailor / cutter / helper) — separate from the
  owner/staff *permission* role already in place. Adding this as its own
  column so both coexist.
- **Salary** is tracked per pay period (e.g. `"2026-08"`) as amount_due vs
  amount_paid — simpler than the base/bonus/deduction breakdown sketched
  earlier. Adopting the simpler version.
- **Notifications (the doc's Phase 6)** explicitly needs a paid
  Twilio/WhatsApp Business API for true automation — not achievable with
  frontend code alone. We're keeping the existing free wa.me click-to-chat
  button (manual tap to send) rather than taking on that cost/complexity,
  unless told otherwise.

### Decided
1. **Multiple garments per order** — adopting `order_items` (one order can
   list several garments, each with its own amount, summing to the total).
   `measurement_id` stays on the order itself (one measurement session per
   order), per the spec — not per item.
2. **Staff visibility stays shared for now** — holding off on restricting
   staff to only their own assigned orders/customers. Revisit later if
   wanted; not building it now.
