import { type NextRequest, NextResponse } from "next/server"
import stripe from "@/lib/stripe"
import { updatePaymentStatus } from "@/app/actions/payment-actions"

// Este é o segredo do webhook do Stripe para testar seu endpoint localmente.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get("stripe-signature") as string

  let event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret!)
  } catch (err) {
    console.error("Falha na verificação da assinatura do webhook.", err)
    return NextResponse.json({ error: "Falha na verificação da assinatura do webhook" }, { status: 400 })
  }

  // Lidar com o evento
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object
      console.log(`PaymentIntent para ${paymentIntent.amount} foi bem-sucedido!`)

      // Atualizar status do pagamento no banco de dados
      await updatePaymentStatus(paymentIntent.id, "succeeded")
      break

    case "payment_intent.payment_failed":
      const failedPaymentIntent = event.data.object
      console.log(`PaymentIntent para ${failedPaymentIntent.amount} falhou.`)

      // Atualizar status do pagamento no banco de dados
      await updatePaymentStatus(failedPaymentIntent.id, "failed")
      break

    // Eventos específicos do PIX
    case "payment_intent.processing":
      const processingPaymentIntent = event.data.object
      console.log(`PaymentIntent para ${processingPaymentIntent.amount} está sendo processado.`)

      // Atualizar status do pagamento no banco de dados
      await updatePaymentStatus(processingPaymentIntent.id, "processing")
      break

    case "payment_intent.requires_action":
      const actionRequiredPaymentIntent = event.data.object
      console.log(`PaymentIntent para ${actionRequiredPaymentIntent.amount} requer ação.`)

      // Atualizar status do pagamento no banco de dados
      await updatePaymentStatus(actionRequiredPaymentIntent.id, "requires_action")
      break

    default:
      console.log(`Tipo de evento não tratado ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
