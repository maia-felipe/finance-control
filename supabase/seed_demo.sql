-- ============================================================================
-- Seed de DEMO — popula uma conta descartável com dados fictícios realistas
-- para tirar prints do README sem expor finanças reais.
-- ============================================================================
-- Como usar:
--   1. Crie/entre numa conta descartável no app e descubra o user_id:
--        select user_id from profiles order by created_at desc;  -- o mais recente
--   2. Cole esse uuid em v_uid abaixo.
--   3. Rode este script inteiro no SQL Editor do Supabase.
--   4. (Opcional, p/ printar a IA) dê acesso temporário:
--        update profiles set role = 'admin' where user_id = '<DEMO_USER_ID>';
--      Lembre de reverter depois: update profiles set role = 'user' where ...
--   5. Para limpar tudo da conta demo: ver o bloco "LIMPEZA" no fim.
-- Mês de referência: junho/2026 (ajuste as datas se quiser outro mês).
-- ============================================================================

do $$
declare
  v_uid uuid := '<DEMO_USER_ID>';  -- <<< cole aqui o user_id da conta demo

  -- ids estáveis das categorias (referenciados pelas transações)
  c_salario  text := gen_random_uuid()::text;
  c_moradia  text := gen_random_uuid()::text;
  c_comida   text := gen_random_uuid()::text;
  c_transp   text := gen_random_uuid()::text;
  c_lazer    text := gen_random_uuid()::text;
  c_saude    text := gen_random_uuid()::text;
  c_assin    text := gen_random_uuid()::text;
  c_invest   text := gen_random_uuid()::text;
begin
  -- --- Categorias ------------------------------------------------------------
  -- (sem coluna "icon": category_icons.sql ainda não foi aplicado neste banco;
  -- o app usa um ícone padrão quando icon é NULL)
  insert into categories (id, user_id, name, type, color, sort_order, exclude_from_charts) values
    (c_salario, v_uid, 'Salário',      'income',     '#22c55e', 0, false),
    (c_moradia, v_uid, 'Moradia',      'expense',    '#3b82f6', 1, false),
    (c_comida,  v_uid, 'Alimentação',  'expense',    '#f59e0b', 2, false),
    (c_transp,  v_uid, 'Transporte',   'expense',    '#ef4444', 3, false),
    (c_lazer,   v_uid, 'Lazer',        'expense',    '#a855f7', 4, false),
    (c_saude,   v_uid, 'Saúde',        'expense',    '#14b8a6', 5, false),
    (c_assin,   v_uid, 'Assinaturas',  'expense',    '#ec4899', 6, false),
    (c_invest,  v_uid, 'Investimentos','investment', '#0ea5e9', 7, false);

  -- --- Transações: maio/2026 (mês anterior, p/ comparativos da IA) ----------
  insert into transactions (id, user_id, date, amount, type, category_id, description, recurring) values
    (gen_random_uuid()::text, v_uid, '2026-05-05', 6500.00, 'income',     c_salario, 'Salário',            true),
    (gen_random_uuid()::text, v_uid, '2026-05-10', 1800.00, 'expense',    c_moradia, 'Aluguel',            true),
    (gen_random_uuid()::text, v_uid, '2026-05-12', 1150.00, 'expense',    c_comida,  'Supermercado',       false),
    (gen_random_uuid()::text, v_uid, '2026-05-18',  420.00, 'expense',    c_transp,  'Combustível',        false),
    (gen_random_uuid()::text, v_uid, '2026-05-22',  300.00, 'expense',    c_lazer,   'Cinema e jantar',    false),
    (gen_random_uuid()::text, v_uid, '2026-05-25',  800.00, 'investment', c_invest,  'Aporte mensal',      true);

  -- --- Transações: junho/2026 (mês atual) ----------------------------------
  insert into transactions (id, user_id, date, amount, type, category_id, description, recurring) values
    (gen_random_uuid()::text, v_uid, '2026-06-05', 6500.00, 'income',     c_salario, 'Salário',            true),
    (gen_random_uuid()::text, v_uid, '2026-06-08',  450.00, 'income',     c_salario, 'Freela design',      false),
    (gen_random_uuid()::text, v_uid, '2026-06-10', 1800.00, 'expense',    c_moradia, 'Aluguel',            true),
    (gen_random_uuid()::text, v_uid, '2026-06-11',  340.00, 'expense',    c_comida,  'Supermercado',       false),
    (gen_random_uuid()::text, v_uid, '2026-06-12',  128.90, 'expense',    c_comida,  'iFood',              false),
    (gen_random_uuid()::text, v_uid, '2026-06-13',  520.00, 'expense',    c_transp,  'Combustível + Uber', false),
    (gen_random_uuid()::text, v_uid, '2026-06-09',  410.00, 'expense',    c_lazer,   'Show + bar',         false),
    (gen_random_uuid()::text, v_uid, '2026-06-07',  210.00, 'expense',    c_saude,   'Farmácia',           false),
    (gen_random_uuid()::text, v_uid, '2026-06-02',   89.70, 'expense',    c_assin,   'Streaming',          true),
    (gen_random_uuid()::text, v_uid, '2026-06-25',  800.00, 'investment', c_invest,  'Aporte mensal',      true);

  -- --- Orçamento: junho/2026 -----------------------------------------------
  insert into budgets (user_id, month, total_limit, category_limits) values
    (v_uid, '2026-06', 5000.00, jsonb_build_object(
      c_moradia, 1800, c_comida, 900, c_transp, 500, c_lazer, 400, c_saude, 300, c_assin, 100));

  -- --- Investimentos -------------------------------------------------------
  insert into investments (id, user_id, name, category, amount_invested, current_value, start_date, last_updated, color, notes) values
    (gen_random_uuid()::text, v_uid, 'Tesouro Selic 2029', 'Renda Fixa', 12000.00, 12840.00, '2025-01-15', '2026-06-01', '#0ea5e9', ''),
    (gen_random_uuid()::text, v_uid, 'BOVA11',             'Ações',       5000.00,  5620.00, '2025-03-10', '2026-06-01', '#22c55e', ''),
    (gen_random_uuid()::text, v_uid, 'HGLG11',             'FII',         3000.00,  3180.00, '2025-06-01', '2026-06-01', '#a855f7', '');

  -- --- Lista de desejos ----------------------------------------------------
  insert into wishlist_items (id, user_id, name, url, price, category, subcategory, priority, planned_installments, purchased, purchased_at, notes, created_at) values
    (gen_random_uuid()::text, v_uid, 'Monitor 4K 27"', null, 2200.00, 'Tech',    'Periféricos', 4, 6, false, null, '', '2026-06-01'),
    (gen_random_uuid()::text, v_uid, 'Cadeira ergonômica', null, 1500.00, 'Casa', 'Home office', 3, 10, false, null, '', '2026-06-03'),
    (gen_random_uuid()::text, v_uid, 'Viagem de fim de ano', null, 4500.00, 'Lazer', 'Viagem',   5, 1, false, null, 'Juntar até dezembro', '2026-06-05');
end $$;

-- ============================================================================
-- LIMPEZA (rode para zerar a conta demo — troque o uuid):
--   delete from transactions  where user_id = '<DEMO_USER_ID>';
--   delete from budgets        where user_id = '<DEMO_USER_ID>';
--   delete from investments    where user_id = '<DEMO_USER_ID>';
--   delete from wishlist_items where user_id = '<DEMO_USER_ID>';
--   delete from categories     where user_id = '<DEMO_USER_ID>';
-- ============================================================================
