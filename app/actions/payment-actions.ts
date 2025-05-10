"use server"

import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import stripe from "@/lib/stripe"
import { revalidatePath } from "next/cache"

// Validation schema
const createPaymentIntentSchema = z.object({
  raffleId: z.string().uuid("Invalid raffle ID"),
  amount: z.number().int().positive("Amount must be positive"),
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required").optional(),
  numberCount: z.number().int().positive("Number count must be positive"),
})

// Create a payment intent
export async function createPaymentIntent(data: {
  raffleId: string
  amount: number
  customerName: string
  customerEmail?: string
  numberCount: number
}) {
  try {
    // Validate input
    const validatedData = createPaymentIntentSchema.parse(data)

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: validatedData.amount * 100, // Convert to cents
      currency: "usd",
      metadata: {
        raffleId: validatedData.raffleId,
        numberCount: validatedData.numberCount.toString(),
        customerName: validatedData.customerName,
      },
      receipt_email: validatedData.customerEmail,
    })

    // Store the payment intent in the database
    const supabase = createServerClient()
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        raffle_id: validatedData.raffleId,
        payment_intent_id: paymentIntent.id,
        amount: validatedData.amount,
        currency: "usd",
        status: paymentIntent.status,
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail || null,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    }
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Update payment status
export async function updatePaymentStatus(paymentIntentId: string, status: string) {
  try {
    const supabase = createServerClient()

    // Find the payment by payment_intent_id
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("id, raffle_id")
      .eq("payment_intent_id", paymentIntentId)
      .single()

    if (findError) {
      throw new Error(findError.message)
    }

    // Update the payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    revalidatePath(`/raffle/${payment.raffle_id}`)

    return { success: true, paymentId: payment.id }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Link payment to purchase
export async function linkPaymentToPurchase(paymentId: string, purchaseId: string) {
  try {
    const supabase = createServerClient()

    // Update the payment with the purchase_id
    const { error: paymentError } = await supabase
      .from("payments")
      .update({
        purchase_id: purchaseId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    if (paymentError) {
      throw new Error(paymentError.message)
    }

    // Update the purchase with the payment_id
    const { error: purchaseError } = await supabase
      .from("purchases")
      .update({
        payment_id: paymentId,
      })
      .eq("id", purchaseId)

    if (purchaseError) {
      throw new Error(purchaseError.message)
    }

    return { success: true }
  } catch (error) {
    console.error("Error linking payment to purchase:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get payment by ID
export async function getPaymentById(paymentId: string) {
  try {
    const supabase = createServerClient()

    const { data: payment, error } = await supabase.from("payments").select("*").eq("id", paymentId).single()

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, payment }
  } catch (error) {
    console.error("Error getting payment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get payment by payment intent ID
export async function getPaymentByIntentId(paymentIntentId: string) {
  try {
    const supabase = createServerClient()

    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_intent_id", paymentIntentId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, payment }
  } catch (error) {
    console.error("Error getting payment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get all payments for a raffle
export async function getPaymentsByRaffleId(raffleId: string) {
  try {
    // Validate the UUID format
    if (!z.string().uuid("Invalid raffle ID").safeParse(raffleId).success) {
      throw new Error("Invalid raffle ID format")
    }

    const supabase = createServerClient()

    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("raffle_id", raffleId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, payments }
  } catch (error) {
    console.error("Error getting payments:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get payment statistics for a raffle
export async function getPaymentStatsByRaffleId(raffleId: string) {
  try {
    // Validate the UUID format
    if (!z.string().uuid("Invalid raffle ID").safeParse(raffleId).success) {
      throw new Error("Invalid raffle ID format")
    }

    const supabase = createServerClient()

    // Get all payments for the raffle
    const { data: payments, error } = await supabase.from("payments").select("*").eq("raffle_id", raffleId)

    if (error) {
      throw new Error(error.message)
    }

    // Calculate statistics
    const successfulPayments = payments.filter((p) => p.status === "succeeded")
    const failedPayments = payments.filter((p) => p.status === "failed")
    const pendingPayments = payments.filter((p) => !["succeeded", "failed"].includes(p.status))

    const totalAmount = successfulPayments.reduce((sum, p) => sum + p.amount, 0)

    return {
      success: true,
      stats: {
        totalAmount,
        successfulPayments: successfulPayments.length,
        failedPayments: failedPayments.length,
        pendingPayments: pendingPayments.length,
        currency: payments.length > 0 ? payments[0].currency : "usd",
      },
    }
  } catch (error) {
    console.error("Error getting payment stats:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
