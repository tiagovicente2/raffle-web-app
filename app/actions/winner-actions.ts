"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { checkAdminAuth } from "./raffle-actions"

// Validation schema
const drawWinnerSchema = z.object({
  raffleId: z.string().uuid("Invalid raffle ID"),
  notes: z.string().optional(),
})

// Draw a winner
export async function drawWinner(data: { raffleId: string; notes?: string }) {
  try {
    // Validate input
    const validatedData = drawWinnerSchema.parse(data)

    // Check if the user is authenticated as admin for this raffle
    const isAdmin = await checkAdminAuth(validatedData.raffleId)
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required")
    }

    const supabase = createServerClient()

    // Get all purchases for this raffle
    const { data: purchases, error: purchasesError } = await supabase
      .from("purchases")
      .select("id, name, cpf, numbers")
      .eq("raffle_id", validatedData.raffleId)

    if (purchasesError) {
      throw new Error(purchasesError.message)
    }

    if (!purchases || purchases.length === 0) {
      return {
        success: false,
        error: "No purchases found for this raffle",
      }
    }

    // Get all previously drawn winning numbers
    const { data: existingWinners, error: winnersError } = await supabase
      .from("winners")
      .select("winning_number")
      .eq("raffle_id", validatedData.raffleId)

    if (winnersError) {
      throw new Error(winnersError.message)
    }

    const drawnNumbers = existingWinners?.map((w) => w.winning_number) || []

    // Flatten all purchased numbers and filter out already drawn numbers
    const allPurchasedNumbers: { number: number; purchaseId: string; name: string; cpf: string }[] = []

    purchases.forEach((purchase) => {
      purchase.numbers.forEach((number) => {
        if (!drawnNumbers.includes(number)) {
          allPurchasedNumbers.push({
            number,
            purchaseId: purchase.id,
            name: purchase.name,
            cpf: purchase.cpf,
          })
        }
      })
    })

    if (allPurchasedNumbers.length === 0) {
      return {
        success: false,
        error: "All purchased numbers have already been drawn",
      }
    }

    // Randomly select a winner
    const randomIndex = Math.floor(Math.random() * allPurchasedNumbers.length)
    const winner = allPurchasedNumbers[randomIndex]

    // Insert the winner
    const { data: newWinner, error: insertError } = await supabase
      .from("winners")
      .insert({
        raffle_id: validatedData.raffleId,
        purchase_id: winner.purchaseId,
        winner_name: winner.name,
        winner_cpf: winner.cpf,
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
        cpf: newWinner.winner_cpf,
        number: newWinner.winning_number,
        drawnAt: newWinner.drawn_at,
      },
    }
  } catch (error) {
    console.error("Error drawing winner:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get all winners for a raffle
export async function getWinnersByRaffleId(raffleId: string) {
  try {
    // Validate the UUID format
    if (!z.string().uuid("Invalid raffle ID").safeParse(raffleId).success) {
      throw new Error("Invalid raffle ID format")
    }

    const supabase = createServerClient()

    const { data: winners, error } = await supabase
      .from("winners")
      .select("*")
      .eq("raffle_id", raffleId)
      .order("drawn_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, winners }
  } catch (error) {
    console.error("Error getting winners:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
