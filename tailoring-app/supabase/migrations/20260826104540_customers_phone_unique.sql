-- Phone is the natural customer identifier — the app already blocks
-- duplicates before insert (lib/phone.js), this is the database-level
-- backstop. Safe to run now: the one duplicate customer (merged manually)
-- and the bare-10-digit legacy phone format have both already been
-- cleaned up to the canonical +91XXXXXXXXXX form.
alter table customers add constraint customers_phone_unique unique (phone);
