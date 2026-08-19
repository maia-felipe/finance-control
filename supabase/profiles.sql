-- ============================================================================
-- Phase 2 — Profiles: plano, trial e "carta branca" (admin/tester)
-- ============================================================================
-- Rodar manualmente no SQL Editor do Supabase (depois de policies.sql).
--
-- Semântica do acesso à IA (o app calcula em src/hooks/useProfile.ts):
--   role admin/tester  → único acesso aos recursos de IA (custam dinheiro real)
--   qualquer outro     → sem IA. Trial e assinatura premium foram desativados:
--                        este é um projeto pessoal/portfólio, não um SaaS pago.
--
-- As colunas/funções do Stripe seguem no repo como referência de integração,
-- mas nenhuma UI as aciona e novos usuários nascem 'free' (sem trial).
-- ============================================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('trial', 'free', 'premium')),
  role text not null default 'user' check (role in ('user', 'tester', 'admin')),
  trial_ends_at timestamptz not null default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- RLS: o cliente só lê o próprio perfil. Nenhuma escrita pelo cliente —
-- mudanças de plano só via service role (Edge Functions) ou dashboard.
alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select using (auth.uid() = user_id);

-- Trigger: cria o perfil (plano free, sem trial) no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: perfis para usuários que já existem
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Carta branca do dono
update public.profiles
set role = 'admin', plan = 'premium'
where user_id = 'a4d06244-1768-49f4-b03b-7b1a7e684932';

-- ----------------------------------------------------------------------------
-- Verificação:
--   select * from public.profiles;
--   -- todos os usuários existentes devem ter perfil; o dono com role = 'admin'.
-- ----------------------------------------------------------------------------
