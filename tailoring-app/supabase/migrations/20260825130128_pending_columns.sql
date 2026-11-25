-- Two columns that were added to supabase/schema.sql after the initial
-- setup but never applied to this database. Both are additive and safe
-- (nullable / defaulted, no data touched).

alter table garment_templates add column if not exists is_active boolean not null default true;
alter table order_status_history add column if not exists note text;
