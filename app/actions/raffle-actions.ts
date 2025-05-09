"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { cookies, headers } from "next/headers"

// Validation schemas
const createRaffleSchema = z.object({
  title: z.string().optional(),
  totalNumbers: z.number().min(1, "At least one number is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
})

const purchaseSchema = z.object({
  raffleId: z.string().uuid("Invalid raffle ID"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  cpf: z
    .string()
    .min(11, "CPF must be 11 digits")
    .max(11, "CPF must be 11 digits")
    .regex(/^\d+$/, "CPF must contain only digits"),
  numbers: z.array(z.number().int().positive()).min(1, "At least one number is required"),
})

// Helper function to get client IP address
function getClientIp() {
  // Try to get the IP from various headers
  const forwardedFor = headers().get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = headers().get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback to a placeholder for development
  return "127.0.0.1"
}

// Create a new raffle
export async function createRaffle(data: {
  title?: string
  totalNumbers: number
  adminPassword: string
}) {
  try {
    // Validate input
    const validatedData = createRaffleSchema.parse(data)

    // Hash the password
    const hashedPassword = await hashPassword(validatedData.adminPassword)

    const supabase = createServerClient()

    const { data: raffle, error } = await supabase
      .from("raffles")
      .insert({
        title: validatedData.title || null,
        total_numbers: validatedData.totalNumbers,
        admin_password: hashedPassword, // Store the hashed password
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, raffleId: raffle.id }
  } catch (error) {
    console.error("Error creating raffle:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get a raffle by ID
export async function getRaffleById(id: string) {
  try {
    // Validate the UUID format
    if (!z.string().uuid("Invalid raffle ID").safeParse(id).success) {
      throw new Error("Invalid raffle ID format")
    }

    const supabase = createServerClient()

    const { data: raffle, error } = await supabase
      .from("raffles")
      .select("id, title, total_numbers, created_at")
      .eq("id", id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, raffle }
  } catch (error) {
    console.error("Error getting raffle:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Purchase raffle numbers
export async function purchaseNumbers(data: {
  raffleId: string
  name: string
  cpf: string
  numbers: number[]
}) {
  try {
    // Validate input
    const validatedData = purchaseSchema.parse(data)

    const supabase = createServerClient()

    // Check if the raffle exists
    const { data: raffle, error: raffleError } = await supabase
      .from("raffles")
      .select("total_numbers")
      .eq("id", validatedData.raffleId)
      .single()

    if (raffleError) {
      throw new Error("Raffle not found")
    }

    // Validate that all numbers are within the raffle's range
    const invalidNumbers = validatedData.numbers.filter((n) => n < 1 || n > raffle.total_numbers)
    if (invalidNumbers.length > 0) {
      return {
        success: false,
        error: `Numbers ${invalidNumbers.join(", ")} are outside the valid range`,
      }
    }

    // Check if numbers are already purchased
    const { data: existingPurchases, error: fetchError } = await supabase
      .from("purchases")
      .select("numbers")
      .eq("raffle_id", validatedData.raffleId)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    // Flatten all purchased numbers
    const allPurchasedNumbers = existingPurchases.flatMap((p) => p.numbers)

    // Check if any of the selected numbers are already purchased
    const alreadyPurchased = validatedData.numbers.filter((n) => allPurchasedNumbers.includes(n))

    if (alreadyPurchased.length > 0) {
      return {
        success: false,
        error: `Numbers ${alreadyPurchased.join(", ")} are already purchased`,
      }
    }

    // Insert the purchase
    const { data: purchase, error } = await supabase
      .from("purchases")
      .insert({
        raffle_id: validatedData.raffleId,
        name: validatedData.name,
        cpf: validatedData.cpf,
        numbers: validatedData.numbers,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/raffle/${validatedData.raffleId}`)

    return { success: true, purchaseId: purchase.id }
  } catch (error) {
    console.error("Error purchasing numbers:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get all purchases for a raffle
export async function getPurchasesByRaffleId(raffleId: string) {
  try {
    // Validate the UUID format
    if (!z.string().uuid("Invalid raffle ID").safeParse(raffleId).success) {
      throw new Error("Invalid raffle ID format")
    }

    const supabase = createServerClient()

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select("*")
      .eq("raffle_id", raffleId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, purchases }
  } catch (error) {
    console.error("Error getting purchases:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Delete a purchase
export async function deletePurchase(purchaseId: string, raffleId: string) {
  try {
    // Validate the UUID format
    if (!z.string().uuid("Invalid ID").safeParse(purchaseId).success) {
      throw new Error("Invalid purchase ID format")
    }
    if (!z.string().uuid("Invalid ID").safeParse(raffleId).success) {
      throw new Error("Invalid raffle ID format")
    }

    // Check if the user is authenticated as admin for this raffle
    const isAdmin = await checkAdminAuth(raffleId)
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required")
    }

    const supabase = createServerClient()

    const { error } = await supabase.from("purchases").delete().eq("id", purchaseId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/raffle/${raffleId}`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting purchase:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Verify admin password and set a secure cookie
export async function verifyAdminPassword(raffleId: string, password: string) {
  try {
    // Validate the UUID format and password
    if (!z.string().uuid("Invalid raffle ID").safeParse(raffleId).success) {
      throw new Error("Invalid raffle ID format")
    }
    if (!z.string().min(1).safeParse(password).success) {
      throw new Error("Password is required")
    }

    const supabase = createServerClient()
    const clientIp = getClientIp()

    // Check for rate limiting
    const { data: attempts, error: attemptsError } = await supabase
      .from("auth_attempts")
      .select("*")
      .eq("ip_address", clientIp)
      .eq("raffle_id", raffleId)
      .single()

    // If there's a record and it has more than 5 attempts in the last hour, block the request
    if (attempts && attempts.attempt_count >= 5) {
      const lastAttempt = new Date(attempts.last_attempt)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      if (lastAttempt > oneHourAgo) {
        return {
          success: false,
          error: "Too many failed attempts. Please try again later.",
          isRateLimited: true,
        }
      }
    }

    // Get the raffle data
    const { data: raffle, error } = await supabase.from("raffles").select("admin_password").eq("id", raffleId).single()

    if (error) {
      throw new Error(error.message)
    }

    // Verify the password against the stored hash
    const isValid = await verifyPassword(password, raffle.admin_password)

    // Update the auth attempts record
    if (attempts) {
      if (isValid) {
        // Reset attempts on successful login
        await supabase
          .from("auth_attempts")
          .update({
            attempt_count: 0,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", attempts.id)
      } else {
        // Increment attempts on failed login
        await supabase
          .from("auth_attempts")
          .update({
            attempt_count: attempts.attempt_count + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", attempts.id)
      }
    } else if (!isValid) {
      // Create a new record for failed attempts
      await supabase.from("auth_attempts").insert({
        ip_address: clientIp,
        raffle_id: raffleId,
        attempt_count: 1,
      })
    }

    if (isValid) {
      // Set a secure HTTP-only cookie for admin authentication
      const cookieStore = cookies()
      cookieStore.set(`admin_auth_${raffleId}`, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      })
    }

    return {
      success: true,
      isValid,
    }
  } catch (error) {
    console.error("Error verifying password:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Check if the user is authenticated as admin for a raffle
export async function checkAdminAuth(raffleId: string) {
  try {
    const cookieStore = cookies()
    const adminCookie = cookieStore.get(`admin_auth_${raffleId}`)
    return adminCookie?.value === "true"
  } catch (error) {
    console.error("Error checking admin auth:", error)
    return false
  }
}

// Logout admin
export async function logoutAdmin(raffleId: string) {
  try {
    const cookieStore = cookies()
    cookieStore.delete(`admin_auth_${raffleId}`)
    return { success: true }
  } catch (error) {
    console.error("Error logging out admin:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
