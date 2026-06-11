// Edge Function: webhook do Stripe — mantém profiles.plan em sincronia com a
// assinatura.
//
// ⚠️ Deploy SEM verificação de JWT (o Stripe não envia JWT do Supabase):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets necessários:
//   STRIPE_SECRET_KEY     — chave secreta do Stripe (sk_...)
//   STRIPE_WEBHOOK_SECRET — signing secret do endpoint (whsec_...)
//
// Eventos a habilitar no endpoint do Stripe Dashboard:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted

import Stripe from 'npm:stripe@18'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const PREMIUM_STATUSES = new Set(['active', 'trialing', 'past_due'])

async function setPlanByCustomer(customerId: string, plan: 'premium' | 'free', subscriptionId: string | null) {
  const { error } = await admin
    .from('profiles')
    .update({ plan, stripe_subscription_id: subscriptionId })
    .eq('stripe_customer_id', customerId)
  if (error) console.error('setPlanByCustomer:', error)
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    console.error('Assinatura do webhook inválida:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (userId) {
          const { error } = await admin
            .from('profiles')
            .update({
              plan: 'premium',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('user_id', userId)
          if (error) console.error('checkout.session.completed:', error)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const plan = PREMIUM_STATUSES.has(sub.status) ? 'premium' : 'free'
        await setPlanByCustomer(sub.customer as string, plan, sub.id)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await setPlanByCustomer(sub.customer as string, 'free', null)
        break
      }
      default:
        // Evento não tratado — ok, respondemos 200 para o Stripe não reenviar.
        break
    }
  } catch (err) {
    console.error(`stripe-webhook (${event.type}):`, err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
