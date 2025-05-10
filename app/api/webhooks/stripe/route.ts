import { type NextRequest, NextResponse } from "next/server"
import stripe from "@/lib/stripe"
import { updatePaymentStatus } from "@/app/actions/payment-actions"

// This is your Stripe webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get("stripe-signature") as string

  let event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret!)
  } catch (err) {
    console.error("Webhook signature verification failed.", err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)

      // Update payment status in database
      await updatePaymentStatus(paymentIntent.id, "succeeded")
      break

    case "payment_intent.payment_failed":
      const failedPaymentIntent = event.data.object
      console.log(`PaymentIntent for ${failedPaymentIntent.amount} failed.`)

      // Update payment status in database
      await updatePaymentStatus(failedPaymentIntent.id, "failed")
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
