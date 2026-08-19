// Edge Function: cria uma sessão do Stripe Checkout (assinatura Premium).
//
// Invocada pelo app via supabase.functions.invoke('stripe-checkout').
// Secrets necessários (supabase secrets set ...):
//   STRIPE_SECRET_KEY  — chave secreta do Stripe (sk_...)
//   STRIPE_PRICE_ID    — price do plano mensal (price_...)
//   APP_URL            — URL do app para redirect (ex.: https://app.exemplo.com)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY são injetados
// automaticamente pelo runtime do Supabase.

import Stripe from 'npm:stripe@18'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Identifica o usuário a partir do JWT enviado pelo app
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Perfil + customer do Stripe (cria na primeira assinatura)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    const appUrl = Deno.env.get('APP_URL') ?? req.headers.get('origin') ?? ''
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: Deno.env.get('STRIPE_PRICE_ID')!, quantity: 1 }],
      success_url: `${appUrl}?checkout=success`,
      cancel_url: `${appUrl}?checkout=cancelled`,
      subscription_data: { metadata: { user_id: user.id } },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('stripe-checkout:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
