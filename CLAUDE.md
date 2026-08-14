# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
```

There are no tests. `npm run build` is the primary correctness check — always run it after making
changes. `noUnusedLocals` / `noUnusedParameters` are on, so dead code fails the build, and the i18n
resources are typed (see below), so a missing translation key is a compile error too.

`npm run lint` currently reports ~12 pre-existing problems (setState-in-effect, a couple of `any`s,
and the react-refresh "only export components" rule that every context file trips). Don't treat a
clean lint as the bar; treat *not adding new problems* as the bar.

## Environment

Requires `.env` at the project root (**not** `.env.local`; see `.env.exemple`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Only `VITE_`-prefixed vars reach the client. The Stripe/Google keys also in `.env` are notes for the
CLI and dashboard, not used by the bundle.

## Architecture

**Stack:** React 19 + Vite, TypeScript (`verbatimModuleSyntax` — always `import type` for type-only
imports; `erasableSyntaxOnly` — no TS `enum`s, use a `const` object + union type), Tailwind CSS v4
(`@tailwindcss/vite`, `@import "tailwindcss"` in `index.css`), Recharts, @dnd-kit/sortable, date-fns,
i18next + react-i18next, vite-plugin-pwa.

**Auth is required.** `AuthContext` wraps Supabase Auth (email/password + Google + password reset).
`App.tsx` gates on it: loading → spinner, `passwordRecovery` → `UpdatePasswordPage`, `!user` →
`AuthPage`. All tables have RLS enabled with per-user policies.

**Provider order** in `App.tsx` — each layer depends on the one above:

```
ThemeProvider > AuthProvider > SettingsProvider > FxProvider > AppContent
```

**Data flow.** Persistence goes through six hooks in `src/hooks/` (`useTransactions`, `useCategories`,
`useBudget`, `useInvestments`, `useWishlist`, `useProfile`). Each one:

1. Fetches on mount via `useEffect`, always filtering `.eq('user_id', userId)` — defence in depth
   behind RLS.
2. Holds data in local React state.
3. Mutates optimistically through [`persist()`](src/lib/persist.ts) — updates state, fires the
   Supabase call in the background, and on failure toasts + refetches (`reload` doubles as rollback).
   There is no per-mutation rollback.
4. Returns `loading: boolean` alongside the data and mutations.

Supabase columns are `snake_case`, TS is `camelCase`, and every hook maps between them **by hand in
three places**: the row→TS read map, the insert object, and an allowlist patch block in `update`.
⚠️ Adding a field to a type without touching all three means it silently never persists —
`useTransactions.updateTransaction` still drops `investmentId`/`installmentGroupId` this way.

**Each `useX()` call owns independent state.** Two components calling `useTransactions()` do not
share a cache. Only one page renders at a time (`App.tsx` uses `&&` guards), so this is mostly
harmless — but it's why the `N` hotkey dispatches through a pub/sub channel
([`src/lib/quickAdd.ts`](src/lib/quickAdd.ts)) instead of opening a modal at App level.

**Navigation.** No router. `App.tsx` owns `tab` and `month` (`"yyyy-MM"`) as state. The `Tab` union
lives in [`src/components/layout/Navbar.tsx`](src/components/layout/Navbar.tsx). Month filtering is
client-side: `getByMonth(month)` filters the full in-memory array by `date.startsWith(month)`.

**Module-level pub/sub** is an established pattern here for cross-tree signals without prop
drilling: [`toast.ts`](src/lib/toast.ts), [`quickAdd.ts`](src/lib/quickAdd.ts),
[`modalStack.ts`](src/lib/modalStack.ts).

## Multi-currency

Every money-bearing row carries its own `currency` (ISO 4217). Nothing is stored pre-converted.

- **Rates**: [Frankfurter](https://frankfurter.dev) `api.frankfurter.dev/v2`, no API key, no account.
  Use **v2**, not v1 — v2 carries the last quote forward across weekends and holidays, so there are
  no gaps to fill.
- **Storage**: all rates are kept against a single base (USD) as
  `{ 'yyyy-MM-dd': { BRL: 5.17, … } }`, units per 1 USD. Any pair derives exactly:
  `amount / rate[from] * rate[to]`. Historical rates never change, so they're cached in
  `localStorage` forever; today's is refetched every ~6h.
- **Which rate**:

  | Value | Rate |
  |---|---|
  | Transactions | the rate on **the transaction's own date** |
  | Investment `currentValue` | **today's** rate |
  | Investment `amountInvested` | the rate on the investment's **`startDate`** |
  | Budgets, wishlist | **today's** rate (forward-looking) |

  Cost basis being historical while market value is live is deliberate: FX movement lands inside
  gain/loss, which is the real result of holding foreign currency.

- **Consuming it**: [`useMoney()`](src/hooks/useMoney.ts) is the one thing screens need —
  `convert` / `convertToday` / `format` / `formatIn` / `symbol` / `preferredCurrency`.
  `useTransactions` additionally exposes a derived `convertedAmount` per transaction; **all totals
  must sum `convertedAmount`, never `amount`**, or they silently add up mixed currencies.
- **Degradation**: with no rate available, `convert` returns the original amount rather than
  inventing a number. Totals then mix currencies — same as pre-multi-currency behaviour — and
  `useFx().available` is false so the UI can say so.

Changing the preferred currency rewrites no data: everything re-converts at read time, so historical
dates keep producing historical values.

## Internationalization

**English is the base language of the codebase.** All source strings are English; `pt-BR` and `es`
are translations in [`src/i18n/locales/`](src/i18n/locales/).

- Locale files are `.ts` modules, **not** `.json` — `resolveJsonModule` is off.
- `en.ts` exports `Resources = typeof en`; the other locales are typed as `Resources`, so a missing
  or misspelled key fails the build. `src/i18n/i18next.d.ts` wires the same type into `t()`.
- Components use `useTranslation()`. Hooks and non-React helpers import `i18n` directly and call
  `i18n.t(...)`.
- Dates: [`formatDate.ts`](src/utils/formatDate.ts) picks the date-fns locale from the active
  language. Never import `ptBR` from date-fns directly in a component.
- **Chart `dataKey`s must be stable English keys** with the label passed via `name={t(...)}`. They
  used to be Portuguese words doubling as object property names, which broke when translated.
- Persisted values that used to be Portuguese are now language-neutral keys (e.g.
  `InvestmentCategory` is `'fixed_income' | 'stocks' | …`, rendered through
  `t('investments.categories.*')`). Category *names* are user data: seeded in the user's language at
  signup and never retranslated.

## Type Conventions

Domain types live in [`src/types/index.ts`](src/types/index.ts). IDs are client-generated strings
([`generateId.ts`](src/utils/generateId.ts)) — that's why every `id` column is `text`, not `uuid`.
Dates are ISO strings (`"yyyy-MM-dd"`). Amounts are plain positive `number`s; `type` distinguishes
income from expense. `Transaction.description` is a non-optional `string` that may be `''` (the
category name is shown instead) — don't make it optional, several call sites use it unguarded.

## Database

**There is no migrations pipeline.** The `.sql` files in [`supabase/`](supabase/) are the source of
truth and must be applied **by hand** in the Supabase SQL Editor — see
[MANUAL_SETUP.md](MANUAL_SETUP.md) for the required order. Adding a column to a type without adding
it to a `.sql` file means it works locally in TS and fails at runtime with
`Could not find the 'x' column of 'y' in the schema cache`. This has already happened twice
(`investments.quantity`, `categories.subcategories`).

Preferences live in `user_settings`, deliberately **not** in `profiles`: `profiles` is select-only
for the client because plan/billing changes must come from the Stripe webhook via the service role.
Giving users UPDATE there would let them set their own `plan = 'premium'`.

## Dormant code

Stripe checkout/webhook Edge Functions, `profiles`, `useProfile` and `PlanBadge` are still in the
repo but **nothing is rendered and nothing is gated** — the AI insights they used to pay for were
removed. `WishlistInsights.tsx` is *not* AI despite the name; it's a local heuristic.
