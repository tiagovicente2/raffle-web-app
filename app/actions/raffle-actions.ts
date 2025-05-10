"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { cookies, headers } from "next/headers"
import { linkPaymentToPurchase } from "./payment-actions"
import { customAlphabet } from "nanoid"

// Cria um gerador de ID amigável (letras maiúsculas e números, sem caracteres ambíguos)
const generateFriendlyId = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8)

// Esquemas de validação
const createRaffleSchema = z.object({
  title: z.string().optional(),
  totalNumbers: z.number().min(1, "É necessário pelo menos um número"),
  adminPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  pricePerNumber: z.number().min(0, "O preço deve ser não-negativo").optional(),
})

const purchaseSchema = z.object({
  raffleId: z.string().uuid("ID de rifa inválido"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido"),
  numbers: z.array(z.number().int().positive()).min(1, "Selecione pelo menos um número"),
  paymentId: z.string().uuid("ID de pagamento inválido").optional(),
})

// Função auxiliar para obter o IP do cliente
function getClientIp() {
  // Tenta obter o IP de vários cabeçalhos
  const forwardedFor = headers().get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = headers().get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback para um placeholder em desenvolvimento
  return "127.0.0.1"
}

// Criar uma nova rifa
export async function createRaffle(data: {
  title?: string
  totalNumbers: number
  adminPassword: string
  pricePerNumber?: number
}) {
  try {
    // Validar entrada
    const validatedData = createRaffleSchema.parse(data)

    // Gerar um ID amigável
    const friendlyId = generateFriendlyId()

    // Hash da senha
    const hashedPassword = await hashPassword(validatedData.adminPassword)

    const supabase = createServerClient()

    const { data: raffle, error } = await supabase
      .from("raffles")
      .insert({
        title: validatedData.title || null,
        total_numbers: validatedData.totalNumbers,
        admin_password: hashedPassword, // Armazena a senha com hash
        friendly_id: friendlyId, // Armazena o ID amigável
      })
      .select("id, friendly_id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, raffleId: raffle.id, friendlyId: raffle.friendly_id }
  } catch (error) {
    console.error("Erro ao criar rifa:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter uma rifa pelo ID
export async function getRaffleById(id: string) {
  try {
    const supabase = createServerClient()

    // Primeiro, tenta buscar pelo ID UUID
    if (z.string().uuid("ID de rifa inválido").safeParse(id).success) {
      const { data: raffle, error } = await supabase
        .from("raffles")
        .select("id, title, total_numbers, created_at, friendly_id")
        .eq("id", id)
        .single()

      if (!error) {
        return { success: true, raffle }
      }
    }

    // Se não encontrou ou não é UUID, tenta pelo ID amigável
    const { data: raffle, error } = await supabase
      .from("raffles")
      .select("id, title, total_numbers, created_at, friendly_id")
      .eq("friendly_id", id.toUpperCase())
      .single()

    if (error) {
      throw new Error("Rifa não encontrada")
    }

    return { success: true, raffle }
  } catch (error) {
    console.error("Erro ao obter rifa:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Comprar números da rifa
export async function purchaseNumbers(data: {
  raffleId: string
  name: string
  email: string
  numbers: number[]
  paymentId?: string
}) {
  try {
    // Validar entrada
    const validatedData = purchaseSchema.parse(data)

    const supabase = createServerClient()

    // Verificar se a rifa existe
    const { data: raffle, error: raffleError } = await supabase
      .from("raffles")
      .select("id, total_numbers")
      .or(`id.eq.${validatedData.raffleId},friendly_id.eq.${validatedData.raffleId}`)
      .single()

    if (raffleError) {
      throw new Error("Rifa não encontrada")
    }

    // Validar que todos os números estão dentro do intervalo da rifa
    const invalidNumbers = validatedData.numbers.filter((n) => n < 1 || n > raffle.total_numbers)
    if (invalidNumbers.length > 0) {
      return {
        success: false,
        error: `Números ${invalidNumbers.join(", ")} estão fora do intervalo válido`,
      }
    }

    // Verificar se os números já foram comprados
    const { data: existingPurchases, error: fetchError } = await supabase
      .from("purchases")
      .select("numbers")
      .eq("raffle_id", raffle.id)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    // Achatar todos os números comprados
    const allPurchasedNumbers = existingPurchases.flatMap((p) => p.numbers)

    // Verificar se algum dos números selecionados já foi comprado
    const alreadyPurchased = validatedData.numbers.filter((n) => allPurchasedNumbers.includes(n))

    if (alreadyPurchased.length > 0) {
      return {
        success: false,
        error: `Números ${alreadyPurchased.join(", ")} já foram comprados`,
      }
    }

    // Inserir a compra
    const { data: purchase, error } = await supabase
      .from("purchases")
      .insert({
        raffle_id: raffle.id,
        name: validatedData.name,
        email: validatedData.email,
        numbers: validatedData.numbers,
        payment_id: validatedData.paymentId || null,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Se um ID de pagamento foi fornecido, vinculá-lo à compra
    if (validatedData.paymentId) {
      const linkResult = await linkPaymentToPurchase(validatedData.paymentId, purchase.id)
      if (!linkResult.success) {
        throw new Error(linkResult.error)
      }
    }

    revalidatePath(`/raffle/${raffle.id}`)

    return { success: true, purchaseId: purchase.id }
  } catch (error) {
    console.error("Erro ao comprar números:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter todas as compras para uma rifa
export async function getPurchasesByRaffleId(raffleId: string) {
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

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select("*")
      .eq("raffle_id", raffle.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, purchases }
  } catch (error) {
    console.error("Erro ao obter compras:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Excluir uma compra
export async function deletePurchase(purchaseId: string, raffleId: string) {
  try {
    // Validar o formato UUID
    if (!z.string().uuid("ID inválido").safeParse(purchaseId).success) {
      throw new Error("Formato de ID de compra inválido")
    }

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

    // Verificar se o usuário está autenticado como administrador para esta rifa
    const isAdmin = await checkAdminAuth(raffle.id)
    if (!isAdmin) {
      throw new Error("Não autorizado: Acesso de administrador necessário")
    }

    const { error } = await supabase.from("purchases").delete().eq("id", purchaseId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/raffle/${raffle.id}`)

    return { success: true }
  } catch (error) {
    console.error("Erro ao excluir compra:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Verificar senha de administrador e definir um cookie seguro
export async function verifyAdminPassword(raffleId: string, password: string) {
  try {
    const supabase = createServerClient()
    const clientIp = getClientIp()

    // Primeiro, obter o ID real da rifa (caso tenha sido fornecido o ID amigável)
    const { data: raffle, error: raffleError } = await supabase
      .from("raffles")
      .select("id, admin_password")
      .or(`id.eq.${raffleId},friendly_id.eq.${raffleId}`)
      .single()

    if (raffleError) {
      throw new Error("Rifa não encontrada")
    }

    // Verificar limitação de taxa
    const { data: attempts, error: attemptsError } = await supabase
      .from("auth_attempts")
      .select("*")
      .eq("ip_address", clientIp)
      .eq("raffle_id", raffle.id)
      .single()

    // Se houver um registro e tiver mais de 5 tentativas na última hora, bloquear a solicitação
    if (attempts && attempts.attempt_count >= 5) {
      const lastAttempt = new Date(attempts.last_attempt)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      if (lastAttempt > oneHourAgo) {
        return {
          success: false,
          error: "Muitas tentativas falhas. Por favor, tente novamente mais tarde.",
          isRateLimited: true,
        }
      }
    }

    // Verificar a senha em relação ao hash armazenado
    const isValid = await verifyPassword(password, raffle.admin_password)

    // Atualizar o registro de tentativas de autenticação
    if (attempts) {
      if (isValid) {
        // Redefinir tentativas em login bem-sucedido
        await supabase
          .from("auth_attempts")
          .update({
            attempt_count: 0,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", attempts.id)
      } else {
        // Incrementar tentativas em login falho
        await supabase
          .from("auth_attempts")
          .update({
            attempt_count: attempts.attempt_count + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", attempts.id)
      }
    } else if (!isValid) {
      // Criar um novo registro para tentativas falhas
      await supabase.from("auth_attempts").insert({
        ip_address: clientIp,
        raffle_id: raffle.id,
        attempt_count: 1,
      })
    }

    if (isValid) {
      // Definir um cookie HTTP-only seguro para autenticação de administrador
      const cookieStore = cookies()
      cookieStore.set(`admin_auth_${raffle.id}`, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60, // 1 hora
        path: "/",
      })
    }

    return {
      success: true,
      isValid,
    }
  } catch (error) {
    console.error("Erro ao verificar senha:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Verificar se o usuário está autenticado como administrador para uma rifa
export async function checkAdminAuth(raffleId: string) {
  try {
    const supabase = createServerClient()

    // Primeiro, obter o ID real da rifa (caso tenha sido fornecido o ID amigável)
    const { data: raffle, error: raffleError } = await supabase
      .from("raffles")
      .select("id")
      .or(`id.eq.${raffleId},friendly_id.eq.${raffleId}`)
      .single()

    if (raffleError) {
      return false
    }

    const cookieStore = cookies()
    const adminCookie = cookieStore.get(`admin_auth_${raffle.id}`)
    return adminCookie?.value === "true"
  } catch (error) {
    console.error("Erro ao verificar autenticação de administrador:", error)
    return false
  }
}

// Logout de administrador
export async function logoutAdmin(raffleId: string) {
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

    const cookieStore = cookies()
    cookieStore.delete(`admin_auth_${raffle.id}`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao fazer logout de administrador:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}

// Obter preço da rifa
export async function getRafflePrice(raffleId: string) {
  try {
    // Para esta demonstração, usaremos um preço fixo por número
    // Em um aplicativo real, você pode armazenar isso no banco de dados
    return { success: true, pricePerNumber: 5 }
  } catch (error) {
    console.error("Erro ao obter preço da rifa:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}
