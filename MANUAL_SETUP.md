# Manual setup checklist

There is no migrations pipeline — the Supabase schema is managed by hand. The `.sql` files in
[`supabase/`](supabase/) are the source of truth, but **nothing applies them for you**. Run them in
the Supabase SQL Editor, in the order below.

## 1. SQL — run in this order

| # | File | What it does |
|---|---|---|
| 1 | [`supabase/schema.sql`](supabase/schema.sql) | The five core tables (`transactions`, `categories`, `budgets`, `investments`, `wishlist_items`). Reconstructed from the live database — **diff it before trusting it** (the query is in the file header). Idempotent. |
| 2 | [`supabase/policies.sql`](supabase/policies.sql) | Backfills `user_id`, then enables RLS + per-operation policies on all five tables. ⚠️ Replace the owner uuid in the backfill block **before** running. |
| 3 | [`supabase/profiles.sql`](supabase/profiles.sql) | `profiles` table (plan/role/trial), the signup trigger, backfill, and marks your account `admin`. |
| 4 | [`supabase/user_settings.sql`](supabase/user_settings.sql) | `user_settings` (language + currency prefs) with its own RLS. Redefines `handle_new_user()` so signup creates both a profile and a settings row. Existing users are backfilled to `pt-BR` / `BRL`. |
| 5 | [`supabase/currency.sql`](supabase/currency.sql) | Adds the `currency` column to every money-bearing table (default `'BRL'`) and migrates `investments.category` from Portuguese labels to stable keys. |
| 6 | [`supabase/investments_fx.sql`](supabase/investments_fx.sql) | Adds `investments.holding_currency` so a currency position knows what it holds, and can be marked to market instead of relying on a hand-typed `current_value`. ⚠️ Backfills existing `fx` rows to `USD` — change it if you hold something else. |
| 7 | [`supabase/category_icons.sql`](supabase/category_icons.sql) | Adds `categories.icon` and backfills the default set. Superseded by `schema.sql` on a fresh database; kept for older ones. |

### Verify

```sql
-- RLS on everywhere
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- no orphaned rows (must all be 0)
select count(*) from transactions where user_id is null;
select count(*) from categories   where user_id is null;
select count(*) from budgets      where user_id is null;
select count(*) from investments  where user_id is null;
select count(*) from wishlist_items where user_id is null;

-- currency + settings landed
select currency, count(*) from transactions group by currency;
select distinct category from investments;   -- fixed_income | stocks | reits | crypto | fx | other
select name, currency, holding_currency, quantity from investments where category = 'fx';
select * from user_settings;
```

## 2. Environment

`.env` at the project root (gitignored; see [`.env.exemple`](.env.exemple)):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Only `VITE_`-prefixed variables reach the client. The Stripe and Google keys in `.env` are notes
for the CLI/dashboard, not used by the app bundle.

## 3. Google OAuth

Supabase Dashboard → Authentication → Providers → Google. Set the client id/secret and add your
app origin to the allowed redirect URLs (`AuthContext` redirects to `window.location.origin`).

## 4. Stripe (dormant)

The billing code is still in the repo but **the UI is hidden and nothing is gated** — the AI
insights it used to pay for were removed. To revive it: re-render `<PlanBadge />` in
[`src/components/layout/Navbar.tsx`](src/components/layout/Navbar.tsx), then:

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_ID=price_... APP_URL=https://<app-url>
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe sends no JWT
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Webhook endpoint: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`, events
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## 5. Exchange rates

No setup needed. Rates come from [Frankfurter](https://frankfurter.dev) (`api.frankfurter.dev`),
which requires no API key and no account. Historical rates are cached in `localStorage`; today's
rate is refetched a few times a day. If the API is unreachable the app falls back to displaying
native amounts.
