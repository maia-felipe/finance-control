# Manual setup checklist — Phases 2 & 3

All the code is in the repo; these are the steps only you can do (accounts, keys, deploys). Do them in order.

## 1. SQL (Supabase SQL Editor)

- [ ] Run [`supabase/profiles.sql`](supabase/profiles.sql) — creates `profiles`, the signup trigger, backfills existing users, and marks your account as `admin` (carta branca).
- [ ] Run [`supabase/ai_insights.sql`](supabase/ai_insights.sql) — creates the AI insights cache table.
- [ ] Run [`supabase/category_icons.sql`](supabase/category_icons.sql) — adds the `icon` column to `categories` and backfills the default set. **Run before deploying the UI redesign** (the app writes `icon` on category insert).
- [ ] Verify: `select * from profiles;` → every user has a row; yours has `role = 'admin'`.

## 2. Stripe account

- [ ] Create the account at https://dashboard.stripe.com (start in **test mode**).
- [ ] Create a Product ("FinanControl Premium") with a **monthly recurring Price** → copy the `price_...` id.
- [ ] Copy the secret key (`sk_test_...`) from Developers → API keys.

## 3. Supabase Edge Functions

Requires the Supabase CLI (`brew install supabase/tap/supabase`).

```bash
supabase login
supabase link --project-ref <SEU_PROJECT_REF>

# Secrets (test mode primeiro; repita com chaves live ao lançar)
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRICE_ID=price_... \
  APP_URL=https://<url-do-app> \
  ANTHROPIC_API_KEY=sk-ant-...
# Opcional: modelo mais barato para os insights (default: claude-opus-4-8)
# supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5

# Deploy
supabase functions deploy stripe-checkout
supabase functions deploy ai-insights
supabase functions deploy stripe-webhook --no-verify-jwt   # ⚠️ o Stripe não envia JWT
```

## 4. Stripe webhook

- [ ] Dashboard → Developers → Webhooks → Add endpoint:
  - URL: `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Copy the signing secret (`whsec_...`) and set it:
  ```bash
  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
  ```

## 5. Anthropic API key

- [ ] Create at https://console.anthropic.com → API keys (already set as secret in step 3).

## 6. End-to-end test (test mode)

- [ ] Log in with your account → navbar should show the **Premium** badge (admin).
- [ ] Reports / Wishlist → "Gerar análise" produces an AI insight; clicking again returns instantly (cache).
- [ ] Create a fresh account → badge shows **Trial · 14d**; AI insights work.
- [ ] In Supabase, set that test profile to `plan = 'free'`, `role = 'user'` → AI cards show the "Assinar Premium" prompt.
- [ ] Click "Assinar Premium" → Stripe Checkout opens → pay with test card `4242 4242 4242 4242` → after redirect, profile becomes `premium` (webhook) and the badge updates.
- [ ] Cancel the subscription in the Stripe dashboard → profile returns to `free`.

When everything passes, repeat step 2/3 secrets with **live** keys.
