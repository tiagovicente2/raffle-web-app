"use server"

import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import stripe from "@/lib/stripe"
import { revalidatePath } from "next/cache"

// Esquema de validação
const createPaymentIntentSchema = z.object({
  raffleId: z.string(),
  amount: z.number().int().positive("O valor deve ser positivo"),
  customerName: z.string().min(1, "Nome é obrigatório"),
  customerEmail: z.string().email("Email válido é obrigatório").optional(),
  numberCount: z.number().int().positive("A quantidade de números deve ser positiva"),
  paymentMethod: z.enum(["card", "pix"]).default("card"),
})

// Criar uma intenção de pagamento
export async function createPaymentIntent(data: {
  raffleId: string
  amount: number
  customerName: string
  customerEmail?: string
  numberCount: number
  paymentMethod?: "card" | "pix"
}) {
  try {
    // Validar entrada
    const validatedData = createPaymentIntentSchema.parse(data)

    const paymentMethod = validatedData.paymentMethod || "card"

    // Configurações específicas para o Brasil
    const paymentSettings: any = {
      amount: validatedData.amount * 100, // Converter para centavos
      currency: "brl", // Usar BRL para pagamentos no Brasil
      metadata: {
        raffleId: validatedData.raffleId,
        numberCount: validatedData.numberCount.toString(),
        customerName: validatedData.customerName,
      },
      receipt_email: validatedData.customerEmail,
    }

    // Configurações específicas para PIX
    if (paymentMethod === "pix") {
      paymentSettings.payment_method_types = ["pix"]
      paymentSettings.payment_method_options = {
        pix: {
          expires_after_seconds: 3600, // Expira após 1 hora
        },
      }
    }

    // Criar uma intenção de pagamento com o Stripe
    const paymentIntent = await stripe.paymentIntents.create(paymentSettings)

    // Armazenar a intenção de pagamento no banco de dados
    const supabase = createServerClient()
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        raffle_id: validatedData.raffleId,
        payment_intent_id: paymentIntent.id,
        amount: validatedData.amount,
        currency: "brl",
        status: paymentIntent.status,
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail || null,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Para PIX, precisamos obter os detalhes do QR code
    let pixInfo = null
    if (paymentMethod === "pix" && paymentIntent.next_action?.display_pix_qr_code) {
      pixInfo = {
        qrCode: paymentIntent.next_action.display_pix_qr_code.image_url_png,
        qrCodeData: paymentIntent.next_action.display_pix_qr_code.data,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hora a partir de agora
      }
    }

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      pixInfo,
      paymentMethod,
    }
  } catch (error) {
    console.error("Erro ao criar intenção de pagamento:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Atualizar status do pagamento
export async function updatePaymentStatus(paymentIntentId: string, status: string) {
  try {
    const supabase = createServerClient()

    // Encontrar o pagamento pelo payment_intent_id
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("id, raffle_id")
      .eq("payment_intent_id", paymentIntentId)
      .single()

    if (findError) {
      throw new Error(findError.message)
    }

    // Atualizar o status do pagamento
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
    console.error("Erro ao atualizar status do pagamento:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Verificar status do pagamento PIX
export async function checkPixPaymentStatus(paymentIntentId: string) {
  try {
    // Verificar o status atual no Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Se o pagamento foi bem-sucedido, atualizar no banco de dados
    if (paymentIntent.status === "succeeded") {
      await updatePaymentStatus(paymentIntentId, "succeeded")
    }

    return {
      success: true,
      status: paymentIntent.status,
      isPaid: paymentIntent.status === "succeeded",
    }
  } catch (error) {
    console.error("Erro ao verificar status do pagamento PIX:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Vincular pagamento à compra
export async function linkPaymentToPurchase(paymentId: string, purchaseId: string) {
  try {
    const supabase = createServerClient()

    // Atualizar o pagamento com o purchase_id
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

    // Atualizar a compra com o payment_id
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
    console.error("Erro ao vincular pagamento à compra:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter pagamento por ID
export async function getPaymentById(paymentId: string) {
  try {
    const supabase = createServerClient()

    const { data: payment, error } = await supabase.from("payments").select("*").eq("id", paymentId).single()

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, payment }
  } catch (error) {
    console.error("Erro ao obter pagamento:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter pagamento por ID de intenção de pagamento
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
    console.error("Erro ao obter pagamento:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter todos os pagamentos para uma rifa
export async function getPaymentsByRaffleId(raffleId: string) {
  try {
    const supabase = createServerClient()

    // Primeiro, obter o ID real da rifa (caso tenha sido fornecido o ID amigável)
    const { data: raffle, error: raffleError } = await supabase
      .from("raffles")
      .select("id")
      .or(`id.eq.${raffleId},friendly_id.eq.${raffleId}`)
      .single()

    if (raffleError) {
      throw new Error("Rifa não encontrada")
    }

    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("raffle_id", raffle.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, payments }
  } catch (error) {
    console.error("Erro ao obter pagamentos:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter estatísticas de pagamento para uma rifa
export async function getPaymentStatsByRaffleId(raffleId: string) {
  try {
    const supabase = createServerClient()

    // Primeiro, obter o ID real da rifa (caso tenha sido fornecido o ID amigável)
    const { data: raffle, error: raffleError } = await supabase
      .from("raffles")
      .select("id")
      .or(`id.eq.${raffleId},friendly_id.eq.${raffleId}`)
      .single()

    if (raffleError) {
      throw new Error("Rifa não encontrada")
    }

    // Obter todos os pagamentos para a rifa
    const { data: payments, error } = await supabase.from("payments").select("*").eq("raffle_id", raffle.id)

    if (error) {
      throw new Error(error.message)
    }

    // Calcular estatísticas
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
        currency: payments.length > 0 ? payments[0].currency : "brl",
      },
    }
  } catch (error) {
    console.error("Erro ao obter estatísticas de pagamento:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}
