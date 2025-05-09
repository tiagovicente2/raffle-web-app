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

interface Purchase {
  id: string
  raffle_id: string
  name: string
  cpf: string
  numbers: number[]
  created_at: string
}

interface AdminPanelProps {
  raffleId: string
  totalNumbers: number
}

export default function AdminPanel({ raffleId, totalNumbers }: AdminPanelProps) {
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
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load purchases",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPurchases()
  }, [raffleId, toast])

  // Get all purchased numbers
  const purchasedNumbers = purchases.flatMap((p) => p.numbers)
  const availableNumbers = totalNumbers - purchasedNumbers.length

  // Filter purchases based on search term
  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.cpf.includes(searchTerm) ||
      purchase.numbers.some((n) => n.toString() === searchTerm),
  )

  const handleDeletePurchase = async (purchaseId: string) => {
    if (confirm("Are you sure you want to delete this purchase? This action cannot be undone.")) {
      setDeleting(purchaseId)

      try {
        const result = await deletePurchase(purchaseId, raffleId)

        if (!result.success) {
          throw new Error(result.error)
        }

        // Update purchases
        setPurchases(purchases.filter((p) => p.id !== purchaseId))

        toast({
          title: "Purchase Deleted",
          description: "The purchase has been deleted successfully",
        })
      } catch (err) {
        toast({
          title: "Deletion Failed",
          description: err instanceof Error ? err.message : "Failed to delete purchase",
          variant: "destructive",
        })
      } finally {
        setDeleting(null)
      }
    }
  }

  const exportData = () => {
    // Mask sensitive data for export
    const maskedPurchases = purchases.map((purchase) => ({
      ...purchase,
      cpf: `${purchase.cpf.substring(0, 3)}*****${purchase.cpf.substring(8)}`, // Mask middle digits
    }))

    const raffleData = {
      id: raffleId,
      totalNumbers,
      purchases: maskedPurchases,
      exportedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(raffleData, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `raffle_${raffleId.slice(0, 8)}_export.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return <div>Loading admin data...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Raffle Summary</CardTitle>
          <CardDescription>Overview of your raffle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total Numbers</p>
              <p className="text-2xl font-bold">{totalNumbers}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Sold</p>
              <p className="text-2xl font-bold">{purchasedNumbers.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{availableNumbers}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Customers</p>
              <p className="text-2xl font-bold">{purchases.length}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="winners">Winners</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchases</CardTitle>
              <CardDescription>Manage customer purchases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, CPF, or number"
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
                            CPF: {purchase.cpf.substring(0, 3)}*****{purchase.cpf.substring(8)}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm">Numbers:</p>
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
                    {searchTerm ? "No purchases match your search" : "No purchases yet"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="winners" className="space-y-4">
          <WinnerSection raffleId={raffleId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
