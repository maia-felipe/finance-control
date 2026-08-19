-- ============================================================================
-- Phase 0 — Enable Row Level Security on all tables
-- ============================================================================
-- Run manually in the Supabase SQL Editor (there is no migrations pipeline;
-- the schema is managed via the dashboard). This file is kept in the repo as
-- the source of truth for the RLS setup.
--
-- ⚠️ BEFORE RUNNING: replace a4d06244-1768-49f4-b03b-7b1a7e684932 below with your auth.users id.
--    Find it in Dashboard → Authentication → Users, or run:
--      select id, email from auth.users;
--
-- Order matters: backfill must happen before NOT NULL and before enabling
-- RLS, otherwise legacy rows (user_id IS NULL) become invisible/invalid.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Backfill: assign legacy rows (created before auth) to the owner
-- ----------------------------------------------------------------------------
update transactions    set user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932' where user_id is null;
update categories      set user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932' where user_id is null;
update budgets         set user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932' where user_id is null;
update investments     set user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932' where user_id is null;
update wishlist_items  set user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932' where user_id is null;

-- ----------------------------------------------------------------------------
-- 2. Harden user_id: default to the caller, never NULL again
-- ----------------------------------------------------------------------------
alter table transactions   alter column user_id set default auth.uid();
alter table categories     alter column user_id set default auth.uid();
alter table budgets        alter column user_id set default auth.uid();
alter table investments    alter column user_id set default auth.uid();
alter table wishlist_items alter column user_id set default auth.uid();

alter table transactions   alter column user_id set not null;
alter table categories     alter column user_id set not null;
alter table budgets        alter column user_id set not null;
alter table investments    alter column user_id set not null;
alter table wishlist_items alter column user_id set not null;

-- ----------------------------------------------------------------------------
-- 3. Unique constraint required by the budgets upsert
--    (useBudget.ts upserts with onConflict: 'user_id,month')
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'budgets_user_month_key'
  ) then
    alter table budgets add constraint budgets_user_month_key unique (user_id, month);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Enable RLS + per-operation policies (own rows only)
-- ----------------------------------------------------------------------------

-- transactions
alter table transactions enable row level security;

create policy "select own rows" on transactions
  for select using (auth.uid() = user_id);

create policy "insert own rows" on transactions
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on transactions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows" on transactions
  for delete using (auth.uid() = user_id);

-- categories
alter table categories enable row level security;

create policy "select own rows" on categories
  for select using (auth.uid() = user_id);

create policy "insert own rows" on categories
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on categories
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows" on categories
  for delete using (auth.uid() = user_id);

-- budgets
alter table budgets enable row level security;

create policy "select own rows" on budgets
  for select using (auth.uid() = user_id);

create policy "insert own rows" on budgets
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on budgets
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows" on budgets
  for delete using (auth.uid() = user_id);

-- investments
alter table investments enable row level security;

create policy "select own rows" on investments
  for select using (auth.uid() = user_id);

create policy "insert own rows" on investments
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on investments
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows" on investments
  for delete using (auth.uid() = user_id);

-- wishlist_items
alter table wishlist_items enable row level security;

create policy "select own rows" on wishlist_items
  for select using (auth.uid() = user_id);

create policy "insert own rows" on wishlist_items
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on wishlist_items
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows" on wishlist_items
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Verification (run after the script):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   -- rowsecurity must be true for all 5 tables.
--   select count(*) from transactions where user_id is null;  -- must be 0
-- ----------------------------------------------------------------------------
