"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { checkAdminAuth } from "./raffle-actions"

// Esquema de validação
const drawWinnerSchema = z.object({
  raffleId: z.string().uuid("ID de rifa inválido"),
  notes: z.string().optional(),
})

// Sortear um ganhador
export async function drawWinner(data: { raffleId: string; notes?: string }) {
  try {
    // Validar entrada
    const validatedData = drawWinnerSchema.parse(data)

    // Verificar se o usuário está autenticado como administrador para esta rifa
    const isAdmin = await checkAdminAuth(validatedData.raffleId)
    if (!isAdmin) {
      throw new Error("Não autorizado: Acesso de administrador necessário")
    }

    const supabase = createServerClient()

    // Obter todas as compras para esta rifa
    const { data: purchases, error: purchasesError } = await supabase
      .from("purchases")
      .select("id, name, email, numbers")
      .eq("raffle_id", validatedData.raffleId)

    if (purchasesError) {
      throw new Error(purchasesError.message)
    }

    if (!purchases || purchases.length === 0) {
      return {
        success: false,
        error: "Nenhuma compra encontrada para esta rifa",
      }
    }

    // Obter todos os números vencedores anteriormente sorteados
    const { data: existingWinners, error: winnersError } = await supabase
      .from("winners")
      .select("winning_number")
      .eq("raffle_id", validatedData.raffleId)

    if (winnersError) {
      throw new Error(winnersError.message)
    }

    const drawnNumbers = existingWinners?.map((w) => w.winning_number) || []

    // Achatar todos os números comprados e filtrar os já sorteados
    const allPurchasedNumbers: { number: number; purchaseId: string; name: string; email: string }[] = []

    purchases.forEach((purchase) => {
      purchase.numbers.forEach((number) => {
        if (!drawnNumbers.includes(number)) {
          allPurchasedNumbers.push({
            number,
            purchaseId: purchase.id,
            name: purchase.name,
            email: purchase.email,
          })
        }
      })
    })

    if (allPurchasedNumbers.length === 0) {
      return {
        success: false,
        error: "Todos os números comprados já foram sorteados",
      }
    }

    // Selecionar aleatoriamente um ganhador
    const randomIndex = Math.floor(Math.random() * allPurchasedNumbers.length)
    const winner = allPurchasedNumbers[randomIndex]

    // Inserir o ganhador
    const { data: newWinner, error: insertError } = await supabase
      .from("winners")
      .insert({
        raffle_id: validatedData.raffleId,
        purchase_id: winner.purchaseId,
        winner_name: winner.name,
        winner_email: winner.email,
        winning_number: winner.number,
        notes: validatedData.notes || null,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    revalidatePath(`/raffle/${validatedData.raffleId}`)

    return {
      success: true,
      winner: {
        id: newWinner.id,
        name: newWinner.winner_name,
        email: newWinner.winner_email,
        number: newWinner.winning_number,
        drawnAt: newWinner.drawn_at,
      },
    }
  } catch (error) {
    console.error("Erro ao sortear ganhador:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter todos os ganhadores para uma rifa
export async function getWinnersByRaffleId(raffleId: string) {
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

    const { data: winners, error } = await supabase
      .from("winners")
      .select("*")
      .eq("raffle_id", raffle.id)
      .order("drawn_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, winners }
  } catch (error) {
    console.error("Erro ao obter ganhadores:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}
