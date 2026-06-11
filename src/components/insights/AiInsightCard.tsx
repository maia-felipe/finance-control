import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { toast } from '../../lib/toast'

interface AiInsightCardProps {
  type: 'wishlist' | 'monthly_report'
  month: string
  title: string
}

// Card de análise com IA (Claude via Edge Function ai-insights).
// Recurso premium: para free/trial expirado mostra o convite de assinatura.
export function AiInsightCard({ type, month, title }: AiInsightCardProps) {
  const { profile, loading: profileLoading, isPremium, startCheckout } = useProfile()
  // Conteúdo fica atrelado ao par tipo+mês: trocar de mês descarta a análise antiga
  const [result, setResult] = useState<{ key: string; content: string } | null>(null)
  const [generating, setGenerating] = useState(false)

  const key = `${type}|${month}`
  const content = result?.key === key ? result.content : ''

  if (profileLoading) return null

  const generate = async () => {
    setGenerating(true)
    const { data, error } = await supabase.functions.invoke('ai-insights', {
      body: { type, month },
    })
    setGenerating(false)
    if (error || !data?.content) {
      let message = 'Não foi possível gerar a análise. Tente novamente em instantes.'
      // FunctionsHttpError carrega a Response original em `context` — é lá que
      // está o corpo JSON com o motivo real (premium_required, generation_limit, etc.)
      if (error && 'context' in error) {
        try {
          const body = await (error as unknown as { context: Response }).context.json()
          console.error('aiInsight:', body)
          if (body?.error === 'premium_required') message = 'Recurso disponível apenas para assinantes Premium.'
          else if (body?.message) message = body.message
        } catch {
          console.error('aiInsight:', error)
        }
      } else {
        console.error('aiInsight:', error ?? data)
      }
      toast.error(message)
      return
    }
    setResult({ key, content: data.content })
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm font-semibold text-slate-800">✨ {title}</h2>
        {isPremium && (
          <Button size="sm" variant="secondary" onClick={generate} disabled={generating}>
            {generating ? 'Analisando...' : content ? 'Atualizar' : 'Gerar análise'}
          </Button>
        )}
      </div>

      {!isPremium ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-slate-500 flex-1">
            {profile?.plan === 'trial'
              ? 'Seu período de teste terminou. Assine o Premium para continuar usando as análises com IA.'
              : 'Análises personalizadas com IA são um recurso do plano Premium.'}
          </p>
          <Button size="sm" onClick={startCheckout}>Assinar Premium</Button>
        </div>
      ) : content ? (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{content}</p>
      ) : (
        <p className="text-sm text-slate-400">
          {generating
            ? 'Gerando análise personalizada dos seus dados...'
            : 'Gere uma análise personalizada dos seus dados com IA.'}
        </p>
      )}
    </Card>
  )
}
