-- Holds the most recent rework issue description directly on the order, so
-- the detail page can show it without joining order_status_history.
alter table orders add column if not exists rework_note text;
