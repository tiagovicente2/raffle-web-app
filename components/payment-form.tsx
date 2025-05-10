"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useStripe, useElements, PaymentElement, AddressElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { updatePaymentStatus } from "@/app/actions/payment-actions"
import { purchaseNumbers } from "@/app/actions/raffle-actions"
import { Loader2 } from "lucide-react"

interface PaymentFormProps {
  clientSecret: string
  paymentId: string
  raffleId: string
  name: string
  email: string
  numbers: number[]
  onSuccess: () => void
  onCancel: () => void
}

export default function PaymentForm({
  clientSecret,
  paymentId,
  raffleId,
  name,
  email,
  numbers,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!stripe) {
      return
    }

    // Verificar o status da intenção de pagamento ao carregar a página
    if (clientSecret) {
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        if (!paymentIntent) return

        switch (paymentIntent.status) {
          case "succeeded":
            setMessage("Pagamento realizado com sucesso!")
            handlePaymentSuccess(paymentIntent.id)
            break
          case "processing":
            setMessage("Seu pagamento está sendo processado.")
            break
          case "requires_payment_method":
            setMessage("Por favor, forneça seus dados de pagamento.")
            break
          default:
            setMessage("Algo deu errado.")
            break
        }
      })
    }
  }, [stripe, clientSecret])

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Atualizar status do pagamento no banco de dados
      await updatePaymentStatus(paymentIntentId, "succeeded")

      // Criar a compra com o ID do pagamento
      const purchaseResult = await purchaseNumbers({
        raffleId,
        name,
        email,
        numbers,
        paymentId,
      })

      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error)
      }

      // Chamar o callback de sucesso
      onSuccess()
    } catch (error) {
      console.error("Erro ao processar pagamento bem-sucedido:", error)
      toast({
        title: "Erro",
        description: "Houve um problema ao completar sua compra. Por favor, entre em contato com o suporte.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      // Stripe.js ainda não carregou.
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      })

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message || "Ocorreu um erro com seu pagamento")
        } else {
          setMessage("Ocorreu um erro inesperado")
        }
        await updatePaymentStatus(clientSecret.split("_secret_")[0], "failed")
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setMessage("Pagamento realizado com sucesso!")
        await handlePaymentSuccess(paymentIntent.id)
      }
    } catch (err) {
      console.error("Erro de pagamento:", err)
      setMessage("Ocorreu um erro ao processar seu pagamento")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Detalhes do Pagamento</CardTitle>
        <CardDescription>Complete sua compra de {numbers.length} números da rifa</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <PaymentElement />
          <AddressElement options={{ mode: "billing" }} />
          {message && <p className="text-sm text-center font-medium text-destructive">{message}</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !stripe || !elements}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Pagar R$${(numbers.length * 5).toFixed(2)}`
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
