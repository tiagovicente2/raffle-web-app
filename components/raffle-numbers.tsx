"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { getPurchasesByRaffleId, getRafflePrice } from "@/app/actions/raffle-actions"
import { createPaymentIntent } from "@/app/actions/payment-actions"
import StripeProvider from "./stripe-provider"
import PaymentForm from "./payment-form"
import PixPayment from "./pix-payment"
import { Loader2, CreditCard, QrCode } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RaffleNumbersProps {
  raffleId: string
  totalNumbers: number
}

export default function RaffleNumbers({ raffleId, totalNumbers }: RaffleNumbersProps) {
  const { toast } = useToast()
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"select" | "info" | "payment" | "success">("select")
  const [purchasedNumbers, setPurchasedNumbers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pricePerNumber, setPricePerNumber] = useState(5) // Preço padrão
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card")
  const [pixInfo, setPixInfo] = useState<{
    qrCode: string
    qrCodeData: string
    expiresAt: string
  } | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar números comprados
        const purchasesResult = await getPurchasesByRaffleId(raffleId)
        if (!purchasesResult.success) {
          throw new Error(purchasesResult.error)
        }
        const allPurchasedNumbers = purchasesResult.purchases.flatMap((p) => p.numbers)
        setPurchasedNumbers(allPurchasedNumbers)

        // Buscar preço da rifa
        const priceResult = await getRafflePrice(raffleId)
        if (priceResult.success && priceResult.pricePerNumber) {
          setPricePerNumber(priceResult.pricePerNumber)
        }
      } catch (err) {
        toast({
          title: "Erro",
          description: err instanceof Error ? err.message : "Falha ao carregar dados da rifa",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [raffleId, toast])

  const handleNumberClick = (number: number) => {
    if (purchasedNumbers.includes(number)) {
      // Número já foi comprado
      return
    }

    if (selectedNumbers.includes(number)) {
      // Desmarcar o número
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number))
    } else {
      // Selecionar o número
      setSelectedNumbers([...selectedNumbers, number])
    }
  }

  const handleContinue = () => {
    if (selectedNumbers.length === 0) {
      toast({
        title: "Nenhum Número Selecionado",
        description: "Por favor, selecione pelo menos um número",
        variant: "destructive",
      })
      return
    }

    setStep("info")
  }

  const handleProceedToPayment = async (method: "card" | "pix") => {
    if (!name.trim()) {
      toast({
        title: "Nome Obrigatório",
        description: "Por favor, informe seu nome",
        variant: "destructive",
      })
      return
    }

    if (!email.trim() || !email.includes("@")) {
      toast({
        title: "Email Inválido",
        description: "Por favor, informe um email válido",
        variant: "destructive",
      })
      return
    }

    setPaymentMethod(method)
    setSubmitting(true)

    try {
      // Calcular valor total
      const amount = selectedNumbers.length * pricePerNumber

      // Criar intenção de pagamento
      const result = await createPaymentIntent({
        raffleId,
        amount,
        customerName: name,
        customerEmail: email,
        numberCount: selectedNumbers.length,
        paymentMethod: method,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setClientSecret(result.clientSecret!)
      setPaymentId(result.paymentId!)

      // Para pagamentos PIX, armazenar informações do QR code
      if (method === "pix" && result.pixInfo) {
        setPixInfo(result.pixInfo)
        // Extrair o ID da intenção de pagamento do clientSecret
        const intentId = result.clientSecret.split("_secret_")[0]
        setPaymentIntentId(intentId)
      }

      setStep("payment")
    } catch (err) {
      toast({
        title: "Falha na Configuração do Pagamento",
        description: err instanceof Error ? err.message : "Falha ao configurar o pagamento",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = () => {
    toast({
      title: "Compra Realizada com Sucesso!",
      description: `Você comprou ${selectedNumbers.length} números com sucesso.`,
    })
    setStep("success")
  }

  const handlePaymentCancel = () => {
    setStep("info")
  }

  const handleReset = () => {
    setSelectedNumbers([])
    setName("")
    setEmail("")
    setClientSecret(null)
    setPaymentId(null)
    setPixInfo(null)
    setPaymentIntentId(null)
    setStep("select")
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (step === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compra Realizada com Sucesso!</CardTitle>
          <CardDescription>Seus números da rifa foram comprados com sucesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <h3 className="font-medium text-green-800">Obrigado pela sua compra!</h3>
            <p className="text-sm text-green-700 mt-1">Você comprou {selectedNumbers.length} números com sucesso.</p>
          </div>

          <div>
            <p className="text-sm font-medium">Seus Números:</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedNumbers.map((number) => (
                <div
                  key={number}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                >
                  {number}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleReset} className="w-full">
            Comprar Mais Números
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "payment") {
    if (paymentMethod === "pix" && pixInfo && paymentIntentId && paymentId) {
      return (
        <PixPayment
          paymentIntentId={paymentIntentId}
          paymentId={paymentId}
          raffleId={raffleId}
          name={name}
          email={email}
          numbers={selectedNumbers}
          qrCodeUrl={pixInfo.qrCode}
          qrCodeData={pixInfo.qrCodeData}
          expiresAt={pixInfo.expiresAt}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )
    }

    if (paymentMethod === "card" && clientSecret && paymentId) {
      return (
        <StripeProvider clientSecret={clientSecret}>
          <PaymentForm
            clientSecret={clientSecret}
            paymentId={paymentId}
            raffleId={raffleId}
            name={name}
            email={email}
            numbers={selectedNumbers}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </StripeProvider>
      )
    }

    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {step === "select" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Selecione os Números</CardTitle>
              <CardDescription>
                Clique nos números que deseja comprar. Cada número custa R${pricePerNumber.toFixed(2)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {Array.from({ length: totalNumbers }, (_, i) => i + 1).map((number) => {
                  const isPurchased = purchasedNumbers.includes(number)
                  const isSelected = selectedNumbers.includes(number)

                  return (
                    <Button
                      key={number}
                      variant={isSelected ? "default" : isPurchased ? "secondary" : "outline"}
                      className={`h-10 w-10 p-0 ${isPurchased ? "cursor-not-allowed opacity-50" : ""}`}
                      onClick={() => handleNumberClick(number)}
                      disabled={isPurchased}
                    >
                      {number}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                    <span className="text-xs">Selecionado</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="h-3 w-3 rounded-full bg-muted"></div>
                    <span className="text-xs">Comprado</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">Selecionados: {selectedNumbers.length}</span>
                  <span className="text-xs text-muted-foreground">
                    Total: R${(selectedNumbers.length * pricePerNumber).toFixed(2)}
                  </span>
                </div>
              </div>
              <Button className="w-full" onClick={handleContinue} disabled={selectedNumbers.length === 0}>
                Continuar
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Suas Informações</CardTitle>
            <CardDescription>Informe seus dados para completar a compra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Enviaremos o recibo para este email</p>
            </div>

            <div>
              <p className="text-sm font-medium">Números Selecionados:</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedNumbers.map((number) => (
                  <div
                    key={number}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Resumo do Pedido</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{selectedNumbers.length} números</span>
                  <span>R${(selectedNumbers.length * pricePerNumber).toFixed(2)}</span>
                </div>
                <div className="border-t pt-1 mt-1">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>R${(selectedNumbers.length * pricePerNumber).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Label className="mb-2 block">Escolha o método de pagamento:</Label>
              <Tabs defaultValue="card" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="card">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Cartão de Crédito
                  </TabsTrigger>
                  <TabsTrigger value="pix">
                    <QrCode className="mr-2 h-4 w-4" />
                    PIX
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="card" className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Pague com cartão de crédito de forma segura através do Stripe.
                  </p>
                  <Button onClick={() => handleProceedToPayment("card")} disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Pagar com Cartão"
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="pix" className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Pague instantaneamente usando PIX. O pagamento é confirmado em segundos.
                  </p>
                  <Button onClick={() => handleProceedToPayment("pix")} disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Pagar com PIX"
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setStep("select")} className="w-full">
              Voltar
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
