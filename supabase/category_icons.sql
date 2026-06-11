-- ============================================================================
-- UI redesign — ícone por categoria
-- ============================================================================
-- Rodar manualmente no SQL Editor do Supabase ANTES de fazer deploy do código
-- que grava a coluna icon (src/hooks/useCategories.ts).
--
-- icon = nome do ícone em kebab-case, de um subconjunto curado de lucide-react
-- (registro em src/lib/categoryIcons.ts). NULL → fallback (Tag) no app.
-- ============================================================================

alter table public.categories add column if not exists icon text;

-- Backfill das categorias padrão já existentes (mesmo mapeamento do seed
-- em src/hooks/useCategories.ts)
update public.categories set icon = 'utensils'       where icon is null and name = 'Alimentação';
update public.categories set icon = 'car'            where icon is null and name = 'Transporte';
update public.categories set icon = 'home'           where icon is null and name = 'Moradia';
update public.categories set icon = 'heart-pulse'    where icon is null and name = 'Saúde';
update public.categories set icon = 'gamepad-2'      where icon is null and name = 'Lazer';
update public.categories set icon = 'graduation-cap' where icon is null and name = 'Educação';
update public.categories set icon = 'tag'            where icon is null and name = 'Outros';
update public.categories set icon = 'banknote'       where icon is null and name = 'Salário';
update public.categories set icon = 'laptop'         where icon is null and name = 'Freelance';
