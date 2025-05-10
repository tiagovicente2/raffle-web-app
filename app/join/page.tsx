"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { getRaffleById } from "@/app/actions/raffle-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, ArrowRight } from "lucide-react"

export default function JoinRaffle() {
  const router = useRouter()
  const { toast } = useToast()
  const [raffleId, setRaffleId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"manual" | "scan">("manual")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await joinRaffle(raffleId)
  }

  const joinRaffle = async (id: string) => {
    if (!id.trim()) {
      toast({
        title: "ID da Rifa Obrigatório",
        description: "Por favor, digite um ID de rifa",
        variant: "destructive",
      })
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await getRaffleById(id)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Redirecionar para a página da rifa
      router.push(`/raffle/${result.raffle.friendly_id || result.raffle.id}`)
    } catch (err) {
      setError("Rifa não encontrada. Por favor, verifique o ID e tente novamente.")
      setLoading(false)
    }
  }

  // Lidar com a leitura do código QR
  const handleScan = (result: string) => {
    setScanResult(result)

    // Extrair ID da rifa da URL se for uma URL válida
    try {
      const url = new URL(result)
      const pathParts = url.pathname.split("/")
      const potentialRaffleId = pathParts[pathParts.length - 1]

      // Validação simples - UUID tem 36 caracteres, mas IDs amigáveis podem ser menores
      if (potentialRaffleId) {
        joinRaffle(potentialRaffleId)
      } else {
        toast({
          title: "Código QR Inválido",
          description: "O código QR não contém um link de rifa válido",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Código QR Inválido",
        description: "O código QR não contém uma URL válida",
        variant: "destructive",
      })
    }
  }

  // Em um aplicativo real, implementaríamos a leitura real de código QR
  // Para esta demonstração, mostraremos apenas um placeholder
  const QRScannerPlaceholder = () => (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
        <QrCode className="h-16 w-16 text-gray-300" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-center text-muted-foreground px-4">
            O acesso à câmera não está disponível nesta demonstração.
            <br />
            Em um aplicativo real, isso abriria sua câmera para escanear um código QR.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Aponte sua câmera para um código QR de rifa para participar instantaneamente
      </p>
    </div>
  )

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Participar de uma Rifa</CardTitle>
          <CardDescription>Digite um ID de rifa ou escaneie um código QR para participar</CardDescription>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "scan")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Digitar ID</TabsTrigger>
            <TabsTrigger value="scan">Escanear QR</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="raffle-id">ID da Rifa</Label>
                  <Input
                    id="raffle-id"
                    placeholder="Digite o ID da rifa"
                    value={raffleId}
                    onChange={(e) => setRaffleId(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Participar da Rifa"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="scan">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <QRScannerPlaceholder />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  )
}
