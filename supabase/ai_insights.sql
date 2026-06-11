-- ============================================================================
-- Phase 3 — Cache de insights de IA
-- ============================================================================
-- Rodar manualmente no SQL Editor do Supabase (depois de profiles.sql).
--
-- A Edge Function ai-insights grava aqui via service role; o cliente apenas
-- lê (e mesmo assim normalmente recebe o conteúdo pela própria function).
-- data_hash = SHA-256 dos dados de entrada — só regeramos quando os dados
-- mudam. generations conta gerações no mês (teto de custo por usuário).
-- ============================================================================

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  insight_type text not null check (insight_type in ('wishlist', 'monthly_report')),
  data_hash text not null,
  content text not null,
  generations int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, insight_type)
);

alter table public.ai_insights enable row level security;

create policy "select own insights" on public.ai_insights
  for select using (auth.uid() = user_id);

-- Nenhuma política de escrita: insert/update só via service role (Edge Function).
