-- ============================================================================
-- FX holdings: record which currency is actually held
-- ============================================================================
-- Run manually in the Supabase SQL Editor, AFTER currency.sql.
--
-- A 'fx' investment has two currencies and the schema only had one:
--
--   currency         -> the money you paid and track the position in (e.g. BRL)
--   holding_currency -> the currency you actually hold (e.g. USD)
--   quantity         -> how many units of holding_currency you hold
--
-- Without holding_currency the app cannot mark the position to market, so
-- current_value was a number typed by hand that went stale the next day. With
-- it, current value is derived on every render as
--     quantity x rate(holding_currency -> currency) today
-- and current_value stops being authoritative for 'fx' rows.
-- ============================================================================

alter table public.investments add column if not exists holding_currency text;

alter table public.investments
  add constraint investments_holding_currency_len check (holding_currency is null or char_length(holding_currency) = 3) not valid;

-- ----------------------------------------------------------------------------
-- Backfill existing 'fx' rows.
-- ----------------------------------------------------------------------------
-- ⚠️ This assumes existing currency holdings are US dollars, which is the only
--    thing the data supports guessing: for the one existing row the implied
--    purchase rate (amount_invested / quantity) is ~5.15 against BRL, i.e. a
--    USD/BRL rate. If you hold anything other than dollars, fix it here or in
--    the investment form before relying on the numbers.
update public.investments
set holding_currency = 'USD'
where category = 'fx' and holding_currency is null;

-- ----------------------------------------------------------------------------
-- Verification:
--   select name, category, currency, holding_currency, quantity,
--          amount_invested / nullif(quantity, 0) as implied_purchase_rate
--   from public.investments where category = 'fx';
--   -- holding_currency must be set, and implied_purchase_rate should look like
--   -- a plausible holding_currency -> currency quote.
-- ----------------------------------------------------------------------------
