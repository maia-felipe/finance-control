import { useProfile } from '../../hooks/useProfile'

// Badge do plano no navbar: Premium (incl. admin/tester), Trial com dias
// restantes (clicável para assinar) ou botão de assinatura para free/expirado.
export function PlanBadge() {
  const { profile, loading, isPremium, trialDaysLeft, startCheckout } = useProfile()

  if (loading || !profile) return null

  const fullAccess = profile.role === 'admin' || profile.role === 'tester' || profile.plan === 'premium'
  if (fullAccess) {
    return (
      <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
        Premium
      </span>
    )
  }

  return (
    <button
      onClick={startCheckout}
      title="Assinar o plano Premium"
      className="px-2 py-1 rounded-md text-xs font-semibold transition cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
    >
      {isPremium ? `Trial · ${trialDaysLeft}d` : 'Assinar Premium'}
    </button>
  )
}
