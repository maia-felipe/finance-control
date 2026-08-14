-- ============================================================================
-- User settings — language and currency preferences
-- ============================================================================
-- Run manually in the Supabase SQL Editor, AFTER profiles.sql.
--
-- ⚠️ Why a separate table instead of new columns on `profiles`:
--    `profiles` deliberately has a SELECT-only policy — the client can read its
--    plan but never write it, because plan changes come from the Stripe webhook
--    via the service role. Adding an UPDATE policy there so users could save a
--    preference would also let any user run
--        update profiles set plan = 'premium' where user_id = auth.uid();
--    Preferences are user-writable, billing is not, so they need separate
--    tables with separate policies.
-- ============================================================================

create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  locale             text not null default 'en' check (locale in ('en', 'pt-BR', 'es')),
  -- ISO 4217 alpha-3. The currency all totals are displayed in.
  preferred_currency text not null default 'USD' check (char_length(preferred_currency) = 3),
  -- Currencies this user actually transacts in. Drives which FX series the
  -- client fetches from Frankfurter (see src/lib/fx.ts).
  active_currencies  text[] not null default '{}',
  updated_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS — own row only. No delete: the row dies with the user via the cascade.
-- ----------------------------------------------------------------------------
alter table public.user_settings enable row level security;

drop policy if exists "select own settings" on public.user_settings;
create policy "select own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "insert own settings" on public.user_settings;
create policy "insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own settings" on public.user_settings;
create policy "update own settings" on public.user_settings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Signup trigger — extends the handle_new_user() defined in profiles.sql so a
-- new account gets both a profile and a settings row. Redefined in full here
-- because `create or replace` replaces the whole body; keep this in sync if
-- profiles.sql ever changes.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Backfill: settings rows for users who already exist.
-- Existing accounts predate multi-currency and hold Brazilian data, so they
-- default to pt-BR/BRL rather than the en/USD used for brand-new accounts.
-- ----------------------------------------------------------------------------
insert into public.user_settings (user_id, locale, preferred_currency, active_currencies)
select id, 'pt-BR', 'BRL', array['BRL']
from auth.users
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- Verification:
--   select * from public.user_settings;
--   -- every existing user has a row
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename = 'user_settings';
--   -- rowsecurity must be true
-- ----------------------------------------------------------------------------
