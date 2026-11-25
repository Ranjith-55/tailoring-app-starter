-- ============================================================================
-- Tailoring Studio — Supabase schema + Row-Level Security policies
--
-- HOW TO USE:
-- 1. Create a free project at https://supabase.com
-- 2. Open the SQL editor in your Supabase dashboard
-- 3. Paste this whole file and run it
-- 4. Then create the "customer-photos" Storage bucket (see bottom of this
--    file) and set it to PRIVATE (not public)
-- 5. Create your own owner login (see README.md "First-time setup")
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Table: staff
-- One row per login (owner or staff), keyed to Supabase's built-in auth users.
-- ----------------------------------------------------------------------------
create table if not exists staff (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('owner', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Table: customers
-- ----------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  address text,
  notes text,
  created_by uuid references staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references staff (id)
);

-- Safe to re-run against a database created before this constraint existed
-- — but only once any duplicate phones already in the table are resolved.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_phone_unique'
  ) then
    alter table customers add constraint customers_phone_unique unique (phone);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Table: measurements
-- One customer can have many measurement sets over time (different garments,
-- or updated measurements). `values` is flexible jsonb so each garment type
-- can have different fields without new columns.
-- ----------------------------------------------------------------------------
create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  garment_type text not null,
  values jsonb not null default '{}'::jsonb,
  recorded_by uuid references staff (id),
  recorded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Table: customer_photos
-- Stores a pointer to the file in Supabase Storage, not the image itself.
-- ----------------------------------------------------------------------------
create table if not exists customer_photos (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid references staff (id),
  uploaded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Table: orders
-- ----------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  measurement_id uuid references measurements (id),
  garment_description text not null,
  status text not null default 'new'
    check (status in ('new', 'stitching', 'ready', 'delivered', 'cancelled')),
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'partial', 'paid')),
  due_date date,
  created_by uuid references staff (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Table: order_status_history
-- Audit trail — who changed what, and whether a WhatsApp notification for
-- that change was sent.
-- ----------------------------------------------------------------------------
create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  status text not null,
  payment_status text not null,
  changed_by uuid references staff (id),
  changed_at timestamptz not null default now(),
  whatsapp_sent boolean not null default false,
  note text
);

-- Safe to re-run against a database created before `note` existed.
alter table order_status_history add column if not exists note text;

-- ============================================================================
-- ROW-LEVEL SECURITY
-- This is what actually enforces "staff can't edit/delete customers" —
-- not the frontend. Even a direct API call is blocked by these rules.
-- ============================================================================

alter table staff enable row level security;
alter table customers enable row level security;
alter table measurements enable row level security;
alter table customer_photos enable row level security;
alter table orders enable row level security;
alter table order_status_history enable row level security;

-- Helper: is the currently logged-in user the owner?
create or replace function is_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and role = 'owner' and is_active = true
  );
$$;

-- Helper: is the currently logged-in user an active staff member (owner or staff)?
create or replace function is_active_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true
  );
$$;

-- ---- staff table ----
-- Everyone logged in can read the staff list (needed to show names, roles).
create policy "staff can view staff" on staff
  for select using (is_active_staff());
-- Only the owner can add/update/deactivate staff.
create policy "owner manages staff" on staff
  for insert with check (is_owner());
create policy "owner updates staff" on staff
  for update using (is_owner());

-- ---- customers table ----
create policy "staff can view customers" on customers
  for select using (is_active_staff());
create policy "staff can add customers" on customers
  for insert with check (is_active_staff());
-- Only the owner can edit or delete a customer — this is the rule you asked for.
create policy "owner can update customers" on customers
  for update using (is_owner());
create policy "owner can delete customers" on customers
  for delete using (is_owner());

-- ---- measurements table ----
create policy "staff can view measurements" on measurements
  for select using (is_active_staff());
create policy "staff can add measurements" on measurements
  for insert with check (is_active_staff());
create policy "owner can update measurements" on measurements
  for update using (is_owner());
create policy "owner can delete measurements" on measurements
  for delete using (is_owner());

-- ---- customer_photos table ----
create policy "staff can view photos" on customer_photos
  for select using (is_active_staff());
create policy "staff can add photos" on customer_photos
  for insert with check (is_active_staff());
create policy "owner can delete photos" on customer_photos
  for delete using (is_owner());

-- ---- orders table ----
-- Staff can create AND update orders (status/payment) by default — see the
-- architecture doc note. Change the update policy to `is_owner()` if you
-- want order edits to be owner-only too.
create policy "staff can view orders" on orders
  for select using (is_active_staff());
create policy "staff can add orders" on orders
  for insert with check (is_active_staff());
create policy "staff can update orders" on orders
  for update using (is_active_staff());
create policy "owner can delete orders" on orders
  for delete using (is_owner());

-- ---- order_status_history table ----
create policy "staff can view history" on order_status_history
  for select using (is_active_staff());
create policy "staff can add history" on order_status_history
  for insert with check (is_active_staff());
create policy "staff can update history" on order_status_history
  for update using (is_active_staff());

-- ============================================================================
-- STORAGE: run this after creating the "customer-photos" bucket
-- Dashboard: Storage -> New bucket -> name "customer-photos" -> Public = OFF
-- ============================================================================

create policy "staff can view customer photos in storage"
  on storage.objects for select
  using (bucket_id = 'customer-photos' and is_active_staff());

create policy "staff can upload customer photos"
  on storage.objects for insert
  with check (bucket_id = 'customer-photos' and is_active_staff());

create policy "owner can delete customer photos in storage"
  on storage.objects for delete
  using (bucket_id = 'customer-photos' and is_owner());

-- ============================================================================
-- EXPANDED SCOPE ADDITIONS (see tailoring-app/ADMIN_PANEL_PLAN.md §9)
-- Human-friendly IDs, multi-garment orders, payments ledger, expenses,
-- staff job role, measurement version labels.
-- ============================================================================

-- ---- human-friendly customer_code (e.g. CUST-0001) ----
create sequence if not exists customer_code_seq;
alter table customers add column if not exists customer_code text unique;

create or replace function set_customer_code()
returns trigger
language plpgsql
as $$
begin
  if new.customer_code is null then
    new.customer_code := 'CUST-' || lpad(nextval('customer_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create or replace trigger trg_set_customer_code
before insert on customers
for each row execute function set_customer_code();

update customers
  set customer_code = 'CUST-' || lpad(nextval('customer_code_seq')::text, 4, '0')
  where customer_code is null;

-- ---- human-friendly order_number (e.g. ORD-0001) ----
create sequence if not exists order_number_seq;
alter table orders add column if not exists order_number text unique;
alter table orders add column if not exists assigned_to uuid references staff (id);
-- Flags a "stitching" order as a rework redo (reopened from Delivered via
-- Issue / Rework), for display + prioritized sorting — see app/orders/.
alter table orders add column if not exists is_rework boolean not null default false;
-- Most recent rework issue description, shown on the order detail page.
alter table orders add column if not exists rework_note text;

create or replace function set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'ORD-' || lpad(nextval('order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create or replace trigger trg_set_order_number
before insert on orders
for each row execute function set_order_number();

update orders
  set order_number = 'ORD-' || lpad(nextval('order_number_seq')::text, 4, '0')
  where order_number is null;

-- ---- measurements: optional version label ----
alter table measurements add column if not exists version_label text;

-- ---- staff: job role (tailor / cutter / helper / ...), separate from the
-- owner/staff permission `role` column above ----
alter table staff add column if not exists job_role text;

-- ---- order_items: an order can now bundle multiple garments ----
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  garment_type text not null,
  description text,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table order_items enable row level security;

drop policy if exists "staff can view order items" on order_items;
create policy "staff can view order items" on order_items
  for select using (is_active_staff());
drop policy if exists "staff can add order items" on order_items;
create policy "staff can add order items" on order_items
  for insert with check (is_active_staff());
drop policy if exists "staff can update order items" on order_items;
create policy "staff can update order items" on order_items
  for update using (is_active_staff());
drop policy if exists "owner can delete order items" on order_items;
create policy "owner can delete order items" on order_items
  for delete using (is_owner());

-- ---- payments: itemized payment ledger (advance / balance / refund) ----
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders (id) on delete set null,
  customer_id uuid not null references customers (id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('advance', 'balance', 'refund')),
  method text not null default 'cash' check (method in ('cash', 'upi', 'card', 'other')),
  received_by uuid references staff (id),
  paid_at timestamptz not null default now()
);

alter table payments enable row level security;

drop policy if exists "staff can view payments" on payments;
create policy "staff can view payments" on payments
  for select using (is_active_staff());
drop policy if exists "staff can add payments" on payments;
create policy "staff can add payments" on payments
  for insert with check (is_active_staff());
drop policy if exists "owner can update payments" on payments;
create policy "owner can update payments" on payments
  for update using (is_owner());
drop policy if exists "owner can delete payments" on payments;
create policy "owner can delete payments" on payments
  for delete using (is_owner());

-- ---- expenses: owner/accounts only, staff have no access at all ----
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric not null,
  description text,
  spent_at date not null default current_date,
  recorded_by uuid references staff (id),
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

drop policy if exists "owner can view expenses" on expenses;
create policy "owner can view expenses" on expenses
  for select using (is_owner());
drop policy if exists "owner can add expenses" on expenses;
create policy "owner can add expenses" on expenses
  for insert with check (is_owner());
drop policy if exists "owner can update expenses" on expenses;
create policy "owner can update expenses" on expenses
  for update using (is_owner());
drop policy if exists "owner can delete expenses" on expenses;
create policy "owner can delete expenses" on expenses
  for delete using (is_owner());

-- ---- orders.status: simplified to match the StitchFlow spec ----
-- (new create-table statement above already has the final enum; this
-- migrates a database where the old 5-status enum was already applied)
alter table orders drop constraint if exists orders_status_check;
update orders set status = 'new' where status = 'received';
update orders set status = 'stitching' where status = 'cutting';
alter table orders alter column status set default 'new';
alter table orders add constraint orders_status_check check (status in ('new', 'stitching', 'ready', 'delivered', 'cancelled'));

-- ---- staff_attendance: owner marks attendance for everyone; owner-only
-- access (staff have no self-view yet — can be added later if wanted) ----
create table if not exists staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff (id) on delete cascade,
  date date not null,
  status text not null default 'present' check (status in ('present', 'absent', 'half_day', 'leave')),
  marked_by uuid references staff (id),
  marked_at timestamptz not null default now(),
  unique (staff_id, date)
);

alter table staff_attendance enable row level security;

drop policy if exists "owner can view attendance" on staff_attendance;
create policy "owner can view attendance" on staff_attendance
  for select using (is_owner());
drop policy if exists "owner can add attendance" on staff_attendance;
create policy "owner can add attendance" on staff_attendance
  for insert with check (is_owner());
drop policy if exists "owner can update attendance" on staff_attendance;
create policy "owner can update attendance" on staff_attendance
  for update using (is_owner());
drop policy if exists "owner can delete attendance" on staff_attendance;
create policy "owner can delete attendance" on staff_attendance
  for delete using (is_owner());

-- ---- staff_salary: owner-only, full stop — staff never see salary data ----
create table if not exists staff_salary (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff (id) on delete cascade,
  period text not null,
  amount_due numeric not null default 0,
  amount_paid numeric not null default 0,
  paid_at timestamptz,
  notes text,
  recorded_by uuid references staff (id),
  created_at timestamptz not null default now(),
  unique (staff_id, period)
);

alter table staff_salary enable row level security;

drop policy if exists "owner can view salary" on staff_salary;
create policy "owner can view salary" on staff_salary
  for select using (is_owner());
drop policy if exists "owner can add salary" on staff_salary;
create policy "owner can add salary" on staff_salary
  for insert with check (is_owner());
drop policy if exists "owner can update salary" on staff_salary;
create policy "owner can update salary" on staff_salary
  for update using (is_owner());
drop policy if exists "owner can delete salary" on staff_salary;
create policy "owner can delete salary" on staff_salary
  for delete using (is_owner());

-- ---- garment_templates: owner-editable garment types + measurement fields,
-- replacing the hard-coded list that used to live in MeasurementForm.js ----
create table if not exists garment_templates (
  type_key text primary key,
  label text not null,
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references staff (id),
  created_at timestamptz not null default now()
);

-- Safe to re-run against a database created before `is_active` existed.
alter table garment_templates add column if not exists is_active boolean not null default true;

alter table garment_templates enable row level security;

drop policy if exists "staff can view garment templates" on garment_templates;
create policy "staff can view garment templates" on garment_templates
  for select using (is_active_staff());
drop policy if exists "owner can add garment templates" on garment_templates;
create policy "owner can add garment templates" on garment_templates
  for insert with check (is_owner());
drop policy if exists "owner can update garment templates" on garment_templates;
create policy "owner can update garment templates" on garment_templates
  for update using (is_owner());
drop policy if exists "owner can delete garment templates" on garment_templates;
create policy "owner can delete garment templates" on garment_templates
  for delete using (is_owner());

insert into garment_templates (type_key, label, fields) values
  ('blouse', 'Blouse', '["bust", "waist", "shoulder", "sleeve_length", "blouse_length", "armhole"]'::jsonb),
  ('chudidhar', 'Chudidhar', '["chest", "waist", "hip", "shoulder", "sleeve_length", "top_length", "bottom_length"]'::jsonb),
  ('lehenga', 'Lehenga', '["waist", "hip", "blouse_length", "skirt_length", "sleeve_length"]'::jsonb),
  ('saree_fall', 'Saree fall', '["fall_length", "pico_length"]'::jsonb),
  ('custom', 'Custom / other', '[]'::jsonb)
on conflict (type_key) do nothing;

-- ---- shop_profile: singleton settings row (shop info + payment/invoice
-- terms), owner-only. The `id boolean primary key default true check (id)`
-- trick guarantees at most one row can ever exist. ----
create table if not exists shop_profile (
  id boolean primary key default true check (id),
  shop_name text,
  phone text,
  address text,
  gst_number text,
  payment_terms text,
  invoice_terms text,
  updated_by uuid references staff (id),
  updated_at timestamptz not null default now()
);

alter table shop_profile enable row level security;

drop policy if exists "owner can view shop profile" on shop_profile;
create policy "owner can view shop profile" on shop_profile
  for select using (is_owner());
drop policy if exists "owner can add shop profile" on shop_profile;
create policy "owner can add shop profile" on shop_profile
  for insert with check (is_owner());
drop policy if exists "owner can update shop profile" on shop_profile;
create policy "owner can update shop profile" on shop_profile
  for update using (is_owner());
