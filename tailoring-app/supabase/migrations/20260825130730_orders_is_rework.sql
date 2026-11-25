-- Flags an order as currently in a rework cycle (reopened from Delivered via
-- "Issue / Rework"). Status stays "stitching" so it still groups with normal
-- in-progress work on the board — this just tags which stitching orders are
-- actually a redo, for display and prioritized sorting. Cleared automatically
-- the next time the status is changed through the normal controls.
alter table orders add column if not exists is_rework boolean not null default false;
