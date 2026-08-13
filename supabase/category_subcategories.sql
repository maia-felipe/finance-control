-- ============================================================================
-- Wishlist feature — subcategorias por categoria
-- ============================================================================
-- Rodar manualmente no SQL Editor do Supabase. Faltou aplicar este ALTER TABLE
-- quando o campo foi introduzido em src/hooks/useCategories.ts (commit
-- 88a417f, feature de wishlist) — sem esta coluna, todo update/insert em
-- categories falha com:
--   "Could not find the 'subcategories' column of 'categories' in the schema cache"
-- ============================================================================

alter table public.categories add column if not exists subcategories text[] not null default '{}';
