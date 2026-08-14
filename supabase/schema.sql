-- ============================================================================
-- Core schema — source of truth for the five main tables
-- ============================================================================
-- Historically these tables were created by hand in the Supabase dashboard and
-- never committed, so the repo had no CREATE TABLE for them at all. This file
-- reconstructs them from the live schema and from supabase/seed_demo.sql.
--
-- ⚠️ RECONSTRUCTED, NOT DUMPED. Before trusting it, diff against the live
--    database:
--      select table_name, column_name, data_type, is_nullable, column_default
--      from information_schema.columns
--      where table_schema = 'public'
--      order by table_name, ordinal_position;
--
-- Everything is `if not exists`, so running this against the existing database
-- is a no-op for tables that are already there — it only fills in what is
-- missing. Run it BEFORE currency.sql and user_settings.sql.
--
-- Note: `id` columns are TEXT, not uuid. Ids are generated client-side by
-- src/utils/generateId.ts (base-36 random + timestamp), never by Postgres.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id                 text primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  -- 'income' | 'expense' | 'investment' | 'both'  (src/types/index.ts CategoryType)
  type               text not null,
  color              text not null,
  -- kebab-case key into the CATEGORY_ICONS registry in src/lib/categoryIcons.ts
  icon               text,
  sort_order         integer not null default 0,
  exclude_from_charts boolean not null default false,
  subcategories      text[] not null default '{}'
);

-- Columns added after the table was first created. Kept here so a database
-- that predates them is brought up to date by this one file.
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists subcategories text[] not null default '{}';

-- ----------------------------------------------------------------------------
-- transactions
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id                   text primary key,
  user_id              uuid not null references auth.users (id) on delete cascade,
  date                 date not null,
  -- Always positive; the sign is implied by `type`.
  amount               numeric(14, 2) not null,
  -- 'income' | 'expense' | 'investment'  (src/types/index.ts TransactionType)
  type                 text not null,
  category_id          text,
  description          text not null default '',
  recurring            boolean not null default false,
  -- Links an aporte/resgate back to the investment it belongs to.
  investment_id        text,
  -- Groups the N transactions created by one instalment wishlist purchase.
  installment_group_id text
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- ----------------------------------------------------------------------------
-- budgets — identity is (user_id, month); there is no surrogate id.
-- useBudget.ts upserts with onConflict: 'user_id,month'.
-- ----------------------------------------------------------------------------
create table if not exists public.budgets (
  user_id         uuid not null references auth.users (id) on delete cascade,
  month           text not null,          -- 'yyyy-MM'
  total_limit     numeric(14, 2) not null default 0,
  category_limits jsonb not null default '{}'::jsonb,
  primary key (user_id, month)
);

-- ----------------------------------------------------------------------------
-- investments
-- ----------------------------------------------------------------------------
create table if not exists public.investments (
  id              text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  -- Stable key: 'fixed_income' | 'stocks' | 'reits' | 'crypto' | 'fx' | 'other'
  -- (migrated from Portuguese display names by currency.sql)
  category        text not null,
  amount_invested numeric(14, 2) not null default 0,
  current_value   numeric(14, 2) not null default 0,
  start_date      date not null,
  last_updated    date not null,
  color           text not null,
  notes           text not null default '',
  -- For 'fx' holdings: units of the currency held.
  quantity        numeric
);

-- Shipped in commit e11f0c9 (TS/UI only) — the DDL was never committed.
alter table public.investments add column if not exists quantity numeric;

-- ----------------------------------------------------------------------------
-- wishlist_items
-- ----------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id                   text primary key,
  user_id              uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  url                  text,
  price                numeric(14, 2) not null default 0,
  category             text,
  subcategory          text,
  priority             integer not null default 3,   -- 1..5
  planned_installments integer not null default 1,   -- 1 = paid in full
  purchased            boolean not null default false,
  purchased_at         date,
  transaction_id       text,
  notes                text,
  created_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Verification:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   -- rowsecurity must be true for all five tables (see policies.sql).
-- ----------------------------------------------------------------------------
