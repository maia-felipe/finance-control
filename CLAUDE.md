# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
```

There are no tests. TypeScript compilation (`npm run build`) is the primary correctness check — always run it after making changes.

## Environment

Requires `.env.local` at the project root:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The Supabase client is a singleton at `src/lib/supabase.ts`. All four tables (`transactions`, `categories`, `budgets`, `investments`) have RLS disabled — no auth is required.

## Architecture

**Stack:** React 19 + Vite, TypeScript (verbatimModuleSyntax enabled — always use `import type` for type-only imports), Tailwind CSS v4 (via `@tailwindcss/vite` plugin, imported as `@import "tailwindcss"` in `index.css`), Recharts, @dnd-kit/sortable, date-fns.

**Data flow:** All persistence goes through four hooks in `src/hooks/`. Each hook:
1. Fetches from Supabase on mount via `useEffect`
2. Holds data in local React state
3. Applies mutations optimistically (updates local state immediately, then fires the Supabase call in background)
4. Returns a `loading: boolean` alongside the data and mutation functions

The Supabase column naming uses `snake_case` while the TypeScript types use `camelCase`. Every hook maps between them explicitly on read and write (e.g. `category_id` ↔ `categoryId`, `total_limit` ↔ `totalLimit`).

**Navigation:** `App.tsx` owns `tab` (current page) and `month` (selected month, format `"yyyy-MM"`) as state. It passes `month` and `onMonthChange` down to pages that need month-scoped data. The `Tab` union type is defined and exported from `src/components/layout/Navbar.tsx`.

**Month filtering** is done client-side: `getByMonth(month)` in `useTransactions` filters the full in-memory array by `date.startsWith(month)`. There is no server-side month filtering.

**BudgetPage** is the only page with its own form state (`totalLimit`, `catLimits`) derived from the hook. It uses a `useEffect` watching `[budgets, month]` to re-sync form state whenever Supabase data arrives or the month changes — this is necessary because the hook data loads asynchronously after the initial render.

**Categories** have a `sort_order` column in Supabase that drives their display order. `reorderCategories` updates `sort_order` for all affected rows. When Supabase returns empty categories and `fc_migrated` is not set in localStorage, `useCategories` seeds the default set automatically.

**One-time migration:** `src/lib/migrate.ts` reads legacy `fc_*` localStorage keys and upserts them into Supabase. It runs once in `App.tsx` on mount (guarded by the `fc_migrated` localStorage flag) before the main UI renders.

## Type Conventions

All domain types live in `src/types/index.ts`. IDs are client-generated strings (`src/utils/generateId.ts`). Dates are ISO strings (`"yyyy-MM-dd"`). Currency amounts are stored as plain `number` (positive for both income and expense — the `type` field distinguishes them). All type-only imports must use `import type`.
