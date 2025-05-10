"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Download, Search, Trash } from "lucide-react"
import { deletePurchase, getPurchasesByRaffleId } from "@/app/actions/raffle-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WinnerSection from "./winner-section"
import QRCodeDialog from "./qr-code-dialog"
import PaymentDashboard from "./payment-dashboard"

interface Purchase {
  id: string
  raffle_id: string
  name: string
  email: string
  numbers: number[]
  created_at: string
  payment_id: string | null
}

interface AdminPanelProps {
  raffleId: string
  totalNumbers: number
  friendlyId?: string
}

export default function AdminPanel({ raffleId, totalNumbers, friendlyId }: AdminPanelProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const result = await getPurchasesByRaffleId(raffleId)

        if (!result.success) {
          throw new Error(result.error)
        }

        setPurchases(result.purchases)
      } catch (err) {
        toast({
          title: "Erro",
          description: err instanceof Error ? err.message : "Falha ao carregar compras",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPurchases()
  }, [raffleId, toast])

  // Obter todos os números comprados
  const purchasedNumbers = purchases.flatMap((p) => p.numbers)
  const availableNumbers = totalNumbers - purchasedNumbers.length

  // Filtrar compras com base no termo de pesquisa
  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.numbers.some((n) => n.toString() === searchTerm),
  )

  const handleDeletePurchase = async (purchaseId: string) => {
    if (confirm("Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.")) {
      setDeleting(purchaseId)

      try {
        const result = await deletePurchase(purchaseId, raffleId)

        if (!result.success) {
          throw new Error(result.error)
        }

        // Atualizar compras
        setPurchases(purchases.filter((p) => p.id !== purchaseId))

        toast({
          title: "Compra Excluída",
          description: "A compra foi excluída com sucesso",
        })
      } catch (err) {
        toast({
          title: "Falha na Exclusão",
          description: err instanceof Error ? err.message : "Falha ao excluir compra",
          variant: "destructive",
        })
      } finally {
        setDeleting(null)
      }
    }
  }

  const exportData = () => {
    // Mascarar dados sensíveis para exportação
    const maskedPurchases = purchases.map((purchase) => ({
      ...purchase,
      email: purchase.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mascarar parte do email
    }))

    const raffleData = {
      id: raffleId,
      friendlyId: friendlyId,
      totalNumbers,
      purchases: maskedPurchases,
      exportedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(raffleData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `rifa_${friendlyId || raffleId.slice(0, 8)}_export.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return <div>Carregando dados de administrador...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Rifa</CardTitle>
          <CardDescription>Visão geral da sua rifa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total de Números</p>
              <p className="text-2xl font-bold">{totalNumbers}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Vendidos</p>
              <p className="text-2xl font-bold">{purchasedNumbers.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-bold">{availableNumbers}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Clientes</p>
              <p className="text-2xl font-bold">{purchases.length}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
          <QRCodeDialog raffleId={raffleId} friendlyId={friendlyId} />
        </CardFooter>
      </Card>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="winners">Ganhadores</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compras</CardTitle>
              <CardDescription>Gerenciar compras de clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou número"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purchase) => (
                    <div key={purchase.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{purchase.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Email: {purchase.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm">Números:</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {purchase.numbers.map((number) => (
                                <div
                                  key={number}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                                >
                                  {number}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePurchase(purchase.id)}
                          disabled={deleting === purchase.id}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    {searchTerm ? "Nenhuma compra corresponde à sua busca" : "Nenhuma compra ainda"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentDashboard raffleId={raffleId} />
        </TabsContent>

        <TabsContent value="winners" className="space-y-4">
          <WinnerSection raffleId={raffleId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
