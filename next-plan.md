# Evolution Roadmap — Finance Control

## Context

The project today is a personal SPA (React + Vite + Supabase) with authentication via Supabase Auth (Google + email/password), but designed for a single user per instance.

The goal is to evolve into a multi-user platform, in this order:

1. **Data security** (Phase 0) — a prerequisite for "more people to use the platform".
2. **Product polish** (Phase 1) — reliability and quick-win features so the product feels solid *before* charging for it.
3. **Payment system** (Phase 2) — monthly subscription with a 14-day free trial, a limited free plan, and "carte blanche" (unlimited) access for the owner and testers.
4. **AI insights** (Phase 3) — in Wishlists and Reports; the natural premium differentiator.
5. **UI redesign** (Phase 4) — a more elaborate visual, including dark mode (awaiting visual references from the user in a future conversation).

This document is a **macro roadmap**, not a detailed implementation plan for all phases.

**Status (2026-06-11):**

- ✅ **Phase 0** — done (code + SQL executed).
- ✅ **Phase 1** — done (1.1 error feedback/toasts, 1.2 recurring engine, 1.3 CSV/OFX import).
- 🟡 **Phase 2 (Stripe)** — code complete (profiles SQL, Edge Functions, plan UI); pending manual setup — see `MANUAL_SETUP.md`.
- 🟡 **Phase 3 (AI insights)** — code complete (ai_insights SQL, Claude Edge Function, gated UI in Reports/Wishlist); pending manual setup — see `MANUAL_SETUP.md`.
- ⏳ **Phase 4 (UI redesign)** — awaiting visual references from the user.

---

## Phase 0 — Critical security fix (execute first, in isolation)

Why first: Currently, RLS is disabled on all tables (`transactions`, `categories`, `budgets`, `investments`, `wishlist_items`) and no `SELECT` filters by `user_id` — any authenticated user can read the data of **all** other users. This needs to be resolved before any user base growth or billing.

Verified state of the code: all INSERT/UPSERT calls already include `user_id`; only the SELECTs and `migrate.ts` are missing it.

### 0.1 Filter all SELECTs by user (defense in depth)

In all hooks in `src/hooks/`, add `.eq('user_id', userId)` to the `select('*')`:

- `useTransactions.ts:21-23`
- `useCategories.ts:34-37`
- `useBudget.ts:20-21`
- `useInvestments.ts:22-23`
- `useWishlist.ts:39-40`

All already have `userId = user?.id` available in the scope of `useEffect`.

### 0.2 Backfill legacy rows, then enable RLS + policies in Supabase

**⚠️ Backfill first.** Rows created before auth (or via the current `migrate.ts`) have `user_id = NULL`. If RLS is enabled before backfilling, the owner's own historical data becomes invisible to every query. The script must assign those rows to the owner before anything else.

Since there is no `supabase/migrations` folder in the repo (schema managed directly by the dashboard), deliver the script as `supabase/policies.sql` in the repo for future reference, and run it manually in the Supabase SQL Editor. For each of the 5 tables (`transactions`, `categories`, `budgets`, `investments`, `wishlist_items`):

```sql
-- 1. Backfill: assign legacy rows (no user_id) to the owner.
--    Replace a4d06244-1768-49f4-b03b-7b1a7e684932 with the owner's auth.users id.
update <table> set user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932' where user_id is null;

-- 2. Harden the column: never allow NULL again, default to the caller.
alter table <table> alter column user_id set default auth.uid();
alter table <table> alter column user_id set not null;

-- 3. Enable RLS + per-operation policies.
alter table <table> enable row level security;

create policy "select own rows" on <table>
  for select using (auth.uid() = user_id);

create policy "insert own rows" on <table>
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on <table>
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own rows" on <table>
  for delete using (auth.uid() = user_id);
```

Additionally, `useBudget.ts:49` upserts with `onConflict: 'user_id,month'` — confirm the `budgets` table has a unique constraint on `(user_id, month)`; if not, add it in the same script:

```sql
alter table budgets add constraint budgets_user_month_key unique (user_id, month);
```

### 0.3 Fix `migrate.ts`

`src/lib/migrate.ts` upserts legacy data from localStorage **without** `user_id` (lines 30-64), which would break isolation for anyone who still has local data (and, after 0.2, the inserts would be rejected by RLS).

Adjust to include `user_id: user.id` (obtained via `supabase.auth.getUser()` or from `AuthContext`) in all upserts (`categories`, `transactions`, `budgets`, `investments`).

### 0.4 Auth hardening: password reset

`AuthContext` has sign-in, sign-up and Google OAuth, but **no password-reset flow**. This is a hidden prerequisite for real (and especially paying) users: the first locked-out customer is a support ticket. Add `supabase.auth.resetPasswordForEmail()` + the redirect/update-password screen. Small task; do it here while touching auth.

### Verification

- `npm run build` (type-check) should pass normally.
- After running the SQL: confirm the owner account still sees **all** of its pre-RLS historical data (proves the backfill worked).
- Test with two different accounts (create a second test account): confirm each account only sees its own data after enabling RLS.
- Confirm that the localStorage migration (if there is legacy data) still works and associates the data with the correct user.

---

## Phase 1 — Product polish (quick wins before billing)

**Status:** New phase. Rationale: only start charging when the product feels reliable. Each item needs a short planning pass, but none requires backend work.

### 1.1 Error feedback / sync status

All mutations are optimistic and failures are only `console.error`'d — a failed background Supabase write silently loses the user's data while the UI shows it as saved. Acceptable for one user; unacceptable for paying customers.

- Add a lightweight toast system (failed write → visible error + rollback of the optimistic state, or a simple retry).
- Standardize the `.then(({ error }) => ...)` pattern across the 5 hooks into one helper.

### 1.2 Recurring transactions engine

The `Transaction.recurring: boolean` field and the form checkbox already exist, but nothing ever creates the next occurrence — the flag is decorative today.

- On app load, find `recurring: true` transactions whose next month has no materialized instance yet, and create it (client-side; no backend needed).
- Decide UX details in its own session: end date? edit/delete "this one vs. the series"?

### 1.3 CSV/OFX bank statement import

Export already exists (`src/utils/exportCSV.ts`); import doesn't. Importing bank statements is typically the #1 retention feature in personal finance apps — and it feeds better data to the AI insights of Phase 3.

- Start with CSV (and evaluate OFX, the standard Brazilian bank export format).
- Needs: column mapping UI, duplicate detection, category assignment (reuse existing categories; this is also a future AI use case — auto-categorization).

---

## Phase 2 — Payment/Subscription System (Stripe)

**Status:** Initial decisions made, but needs its own planning session before becoming tasks. Summary of decisions:

- **Provider:** Stripe (Checkout + Billing/Subscriptions).
- **Plans:** Free (limited), 14-day trial, Premium (monthly paid).
- **"Carte Blanche" Access:** `profiles` table (`user_id`, `plan`, `role`, `trial_ends_at`, `stripe_customer_id`, `stripe_subscription_id`). Users with `role = 'admin'` or `role = 'tester'` ignore plan limits. Manual editing via Supabase dashboard initially (no admin UI for now).
- **Stripe Webhooks:** require a Supabase Edge Function (the app is currently frontend-only; this function becomes the first piece of "backend").
- **Profile Creation Trigger:** when creating an account, create a row in `profiles` with `plan = 'trial'`, `trial_ends_at = now() + 14 days`.

**Open for the next session:**

- What exactly is limited in the free plan (number of transactions? categories? no complete reports?). Note: **AI insights (Phase 3) are the most natural premium differentiator** — they have real per-use cost, so gating them is both fair and easy to justify; consider making them the main paid feature instead of capping basic usage.
- Upgrade/downgrade and cancellation flow within the app.
- Where/how to expose the "carte blanche" for yourself (probably your `user_id` marked as `role = 'admin'` manually).

---

## Phase 3 — AI Insights (Wishlist + Reports)

**Status:** Provider decision made, architecture to be refined in a separate session.

- **Provider:** Claude (Anthropic API) via Supabase Edge Function — the key lives in the backend, never in the client. (The Stripe webhook function from Phase 2 establishes the Edge Function pattern first.)
- **Input data already exists and requires no new input** — transactions, budgets, wishlist items and installments are all in Supabase.

**Candidate insights (pick/refine in the planning session):**

- **Wishlist:** purchase-timing advice ("based on your average balance, buy X in August; buying now would break your budget by R$Y"), smarter than the current greedy fits-this-month algorithm in `WishlistInsights.tsx`.
- **Reports:** monthly natural-language summary (top changes vs. previous month, spending anomalies, category drift).
- **Later:** auto-categorization of imported bank statements (synergy with 1.3).

**Architecture notes for the planning session:**

- **Cache results** (e.g., an `ai_insights` table keyed by user + month + insight type) — recompute only when underlying data changes, to control API cost.
- Gate behind plan check (`profiles.plan`) from Phase 2.
- Define a monthly per-user generation cap as a cost backstop.

---

## Phase 4 — UI Redesign

**Status:** Awaiting visual references from the user (future conversation). Scope notes so far:

- More elaborate visual identity (current UI is functional, hand-rolled Tailwind components: Card, Button, Input, Select, Modal, Badge).
- **Dark mode** — not implemented today (hardcoded light palette); bundle it here rather than retrofitting twice.
- Decision to make in the planning session: keep evolving the hand-rolled components vs. adopting a component library (e.g., shadcn/ui, which is Tailwind-native and copy-in rather than a dependency).
- The PWA is already configured (`vite-plugin-pwa`, standalone manifest) — the redesign should keep mobile/installed usage as a first-class target.

---

## Backlog — ideas beyond the current horizon

Not scheduled; recorded so they aren't lost:

- **Shared households** — two users (e.g., a couple) sharing transactions/budgets. Likely the strongest differentiator vs. other personal finance apps, but architecturally heavy (changes the RLS model from "own rows" to membership-based). Decide only after multi-user is stable.
- **PWA push notifications** — budget-limit alerts, recurring-transaction reminders. The PWA base already exists.
- **Server-side month filtering & pagination** — today `getByMonth()` filters the full in-memory array client-side; fine for one user, revisit when accounts accumulate years of data.
- **Onboarding flow** — first-run guidance for new users (category seeding already happens automatically; build on it).
