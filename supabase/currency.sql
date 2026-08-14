-- ============================================================================
-- Multi-currency support
-- ============================================================================
-- Run manually in the Supabase SQL Editor, AFTER schema.sql.
--
-- Every money value now carries the currency it was transacted in. Conversion
-- to the user's preferred currency happens client-side at read time (see
-- src/lib/fx.ts), using the exchange rate of each row's own date — so changing
-- the preferred currency never rewrites data, and historical amounts keep the
-- rate they were bought at.
--
-- The default is 'BRL' because every row that exists today is implicitly in
-- Brazilian reais. New rows get the user's preferred currency from the client.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Currency column on everything that holds a money value
-- ----------------------------------------------------------------------------
alter table public.transactions   add column if not exists currency text not null default 'BRL';
alter table public.investments    add column if not exists currency text not null default 'BRL';
alter table public.budgets        add column if not exists currency text not null default 'BRL';
alter table public.wishlist_items add column if not exists currency text not null default 'BRL';

-- ISO 4217 alpha-3. Not a foreign key or an enum: the list comes from
-- Frankfurter's /v2/currencies at runtime and should not need a migration to
-- grow.
alter table public.transactions   add constraint transactions_currency_len   check (char_length(currency) = 3) not valid;
alter table public.investments    add constraint investments_currency_len    check (char_length(currency) = 3) not valid;
alter table public.budgets        add constraint budgets_currency_len        check (char_length(currency) = 3) not valid;
alter table public.wishlist_items add constraint wishlist_items_currency_len check (char_length(currency) = 3) not valid;

-- ----------------------------------------------------------------------------
-- 2. Investment categories become stable keys
-- ----------------------------------------------------------------------------
-- They used to be Portuguese display strings persisted as an enum-ish union
-- ('Renda Fixa', 'Ações', …). With English as the base language and pt-BR/es
-- as translations, the stored value has to be language-neutral; the label is
-- resolved through i18n at display time.
update public.investments set category = case category
  when 'Renda Fixa' then 'fixed_income'
  when 'Ações'      then 'stocks'
  when 'FII'        then 'reits'
  when 'Cripto'     then 'crypto'
  when 'Câmbio'     then 'fx'
  when 'Outro'      then 'other'
  else category                      -- already migrated, or unknown: leave alone
end
where category in ('Renda Fixa', 'Ações', 'FII', 'Cripto', 'Câmbio', 'Outro');

-- ----------------------------------------------------------------------------
-- Verification:
--   select distinct category from public.investments;
--   -- expect only: fixed_income | stocks | reits | crypto | fx | other
--
--   select currency, count(*) from public.transactions group by currency;
--   -- expect every existing row to be 'BRL'
-- ----------------------------------------------------------------------------
