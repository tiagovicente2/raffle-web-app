"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Check, RefreshCw, Loader2 } from "lucide-react"
import { checkPixPaymentStatus } from "@/app/actions/payment-actions"
import { purchaseNumbers } from "@/app/actions/raffle-actions"

interface PixPaymentProps {
  paymentIntentId: string
  paymentId: string
  raffleId: string
  name: string
  email: string
  numbers: number[]
  qrCodeUrl: string
  qrCodeData: string
  expiresAt: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PixPayment({
  paymentIntentId,
  paymentId,
  raffleId,
  name,
  email,
  numbers,
  qrCodeUrl,
  qrCodeData,
  expiresAt,
  onSuccess,
  onCancel,
}: PixPaymentProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [timeLeft, setTimeLeft] = useState("")
  const [autoCheckInterval, setAutoCheckInterval] = useState<NodeJS.Timeout | null>(null)

  // Formatar o tempo restante
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date()
      const expiry = new Date(expiresAt)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("Expirado")
        if (autoCheckInterval) {
          clearInterval(autoCheckInterval)
        }
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`)
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, autoCheckInterval])

  // Verificar automaticamente o status do pagamento a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await checkPixPaymentStatus(paymentIntentId)
      if (result.success && result.isPaid) {
        handlePaymentSuccess()
        clearInterval(interval)
      }
    }, 5000)

    setAutoCheckInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [paymentIntentId])

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(qrCodeData)
    setCopied(true)
    toast({
      title: "Código PIX copiado!",
      description: "Cole no seu aplicativo de banco para pagar",
    })
    setTimeout(() => setCopied(false), 3000)
  }

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const result = await checkPixPaymentStatus(paymentIntentId)
      if (!result.success) {
        throw new Error(result.error)
      }

      if (result.isPaid) {
        handlePaymentSuccess()
      } else {
        toast({
          title: "Pagamento ainda não recebido",
          description: "Por favor, complete o pagamento PIX ou aguarde a confirmação",
        })
      }
    } catch (error) {
      toast({
        title: "Erro ao verificar pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  const handlePaymentSuccess = async () => {
    try {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pagamento via PIX</CardTitle>
        <CardDescription>
          Escaneie o QR code abaixo ou copie o código PIX para pagar
          <span className="ml-2 font-medium">
            (Expira em: <span className="text-primary">{timeLeft}</span>)
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-lg border">
          <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code PIX" className="w-64 h-64" />
        </div>

        <div className="w-full">
          <Button
            variant="outline"
            onClick={handleCopyPixCode}
            className="w-full flex items-center justify-center"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Código PIX
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg w-full text-sm">
          <h4 className="font-medium mb-2">Instruções:</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Abra o aplicativo do seu banco</li>
            <li>Escolha a opção de pagamento via PIX</li>
            <li>Escaneie o QR code ou cole o código copiado</li>
            <li>Confirme o valor de R${(numbers.length * 5).toFixed(2)}</li>
            <li>Conclua o pagamento</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleCheckStatus} disabled={checking}>
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar Pagamento
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
