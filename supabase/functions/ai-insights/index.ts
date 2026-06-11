// Edge Function: gera insights financeiros com Claude (Anthropic API).
//
// Invocada pelo app via supabase.functions.invoke('ai-insights',
//   { body: { type: 'wishlist' | 'monthly_report', month: 'yyyy-MM' } }).
//
// A chave da Anthropic vive aqui (backend) — nunca no cliente.
// Secrets necessários:
//   ANTHROPIC_API_KEY — chave da Anthropic (sk-ant-...)
//   ANTHROPIC_MODEL   — opcional; default claude-opus-4-8
//                       (alternativas mais baratas: claude-sonnet-4-6, claude-haiku-4-5)
//
// Controles de custo:
//   - cache por (user, month, type) com hash dos dados — só regenera se mudou
//   - teto de MAX_GENERATIONS_PER_MONTH gerações por usuário/mês
//   - gate de plano: premium / trial ativo / admin / tester

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MAX_GENERATIONS_PER_MONTH = 20

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-4-8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isPremium(profile: { plan: string; role: string; trial_ends_at: string } | null): boolean {
  if (!profile) return false
  if (profile.role === 'admin' || profile.role === 'tester') return true
  if (profile.plan === 'premium') return true
  return profile.plan === 'trial' && new Date(profile.trial_ends_at) > new Date()
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function monthsAgo(month: string, n: number): string {
  let result = month
  for (let i = 0; i < n; i++) result = prevMonth(result)
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // --- Autenticação -------------------------------------------------------
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return json({ error: 'Não autenticado' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // --- Gate de plano ------------------------------------------------------
    const { data: profile } = await admin
      .from('profiles')
      .select('plan, role, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!isPremium(profile)) {
      return json({ error: 'premium_required' }, 403)
    }

    // --- Input --------------------------------------------------------------
    const { type, month } = await req.json().catch(() => ({}))
    if ((type !== 'wishlist' && type !== 'monthly_report') || !/^\d{4}-\d{2}$/.test(month ?? '')) {
      return json({ error: 'Parâmetros inválidos: { type, month }' }, 400)
    }

    // --- Dados de entrada (sempre filtrados pelo usuário) -------------------
    const input: Record<string, unknown> = {}

    if (type === 'monthly_report') {
      const prev = prevMonth(month)
      const { data: txs } = await admin
        .from('transactions')
        .select('date, amount, type, description, category_id, recurring')
        .eq('user_id', user.id)
        .gte('date', `${prev}-01`)
        .lte('date', `${month}-31`)
      const { data: budget } = await admin
        .from('budgets')
        .select('month, total_limit, category_limits')
        .eq('user_id', user.id)
        .in('month', [month, prev])
      const { data: categories } = await admin
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id)
      input.transactions = txs ?? []
      input.budgets = budget ?? []
      input.categories = categories ?? []
      input.month = month
      input.previousMonth = prev
    } else {
      const { data: items } = await admin
        .from('wishlist_items')
        .select('name, price, priority, planned_installments, purchased, category')
        .eq('user_id', user.id)
      const { data: txs } = await admin
        .from('transactions')
        .select('date, amount, type')
        .eq('user_id', user.id)
        .gte('date', `${monthsAgo(month, 6)}-01`)
        .lte('date', `${month}-31`)
      const { data: budget } = await admin
        .from('budgets')
        .select('month, total_limit')
        .eq('user_id', user.id)
        .eq('month', month)
      input.wishlist = items ?? []
      input.recentTransactions = txs ?? []
      input.budget = budget ?? []
      input.month = month
    }

    // --- Cache --------------------------------------------------------------
    const dataHash = await sha256(JSON.stringify(input))
    const { data: cached } = await admin
      .from('ai_insights')
      .select('content, data_hash, generations')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('insight_type', type)
      .maybeSingle()

    if (cached && cached.data_hash === dataHash) {
      return json({ content: cached.content, cached: true })
    }

    // --- Teto de gerações por mês -------------------------------------------
    const { data: monthRows } = await admin
      .from('ai_insights')
      .select('generations')
      .eq('user_id', user.id)
      .eq('month', month)
    const totalGenerations = (monthRows ?? []).reduce((s, r) => s + (r.generations ?? 0), 0)
    if (totalGenerations >= MAX_GENERATIONS_PER_MONTH) {
      return json({ error: 'generation_limit', message: 'Limite mensal de análises atingido.' }, 429)
    }

    // --- Geração ------------------------------------------------------------
    const system = type === 'monthly_report'
      ? 'Você é um consultor financeiro pessoal brasileiro. Analise os dados do mês do usuário (valores em R$) e escreva um resumo curto e útil em português: principais variações vs. mês anterior, categorias que mais pesaram, sinais de atenção (orçamento estourado, gastos atípicos) e uma recomendação prática. Seja direto e específico com números. Máximo ~250 palavras, sem markdown pesado (apenas parágrafos curtos e, se precisar, listas com "-").'
      : 'Você é um consultor financeiro pessoal brasileiro. O usuário tem uma lista de desejos de compras (valores em R$), histórico recente de receitas/gastos e orçamento. Aconselhe em português: quais itens cabem agora sem comprometer o orçamento, o que adiar e para quando (estime meses com base no saldo médio), e se parcelar algum item faz sentido. Considere a prioridade (1-5) dos itens. Seja direto e específico com números. Máximo ~250 palavras, sem markdown pesado (apenas parágrafos curtos e, se precisar, listas com "-").'

    // thinking adaptativo e output_config.effort só são suportados pela
    // linha Opus/Fable — Haiku e Sonnet retornam invalid_request_error.
    const supportsEffort = /^claude-(opus|fable|mythos)/.test(MODEL)

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      ...(supportsEffort ? { thinking: { type: 'adaptive' as const }, output_config: { effort: 'low' as const } } : {}),
      system,
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    })

    if (response.stop_reason === 'refusal') {
      return json({ error: 'generation_failed', message: 'Não foi possível gerar a análise.' }, 502)
    }

    const content = response.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()
    if (!content) {
      return json({ error: 'generation_failed', message: 'Não foi possível gerar a análise.' }, 502)
    }

    // --- Salva no cache -------------------------------------------------------
    const { error: upsertError } = await admin.from('ai_insights').upsert({
      user_id: user.id,
      month,
      insight_type: type,
      data_hash: dataHash,
      content,
      generations: (cached?.generations ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,month,insight_type' })
    if (upsertError) console.error('cache upsert:', upsertError)

    return json({ content, cached: false })
  } catch (err) {
    console.error('ai-insights:', err)
    // Detalhe temporário para diagnóstico — remover depois de confirmar a causa.
    const detail = err instanceof Anthropic.APIError
      ? { status: err.status, message: err.message }
      : err instanceof Error ? err.message : String(err)
    return json({ error: 'Erro ao gerar a análise', detail }, 500)
  }
})
