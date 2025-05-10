"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Lock, LogOut } from "lucide-react"
import Link from "next/link"
import RaffleNumbers from "@/components/raffle-numbers"
import AdminPanel from "@/components/admin-panel"
import QRCodeDialog from "@/components/qr-code-dialog"
import { checkAdminAuth, getRaffleById, logoutAdmin, verifyAdminPassword } from "@/app/actions/raffle-actions"

interface RaffleData {
  id: string
  title: string | null
  total_numbers: number
  created_at: string
  friendly_id?: string
}

export default function RaffleContent({ raffleId }: { raffleId: string }) {
  const { toast } = useToast()
  const [raffleData, setRaffleData] = useState<RaffleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitTimer, setRateLimitTimer] = useState(0)

  useEffect(() => {
    const fetchRaffle = async () => {
      try {
        const result = await getRaffleById(raffleId)

        if (!result.success) {
          throw new Error(result.error)
        }

        setRaffleData(result.raffle)

        // Verificar se o usuário já está autenticado como administrador
        const adminStatus = await checkAdminAuth(result.raffle.id)
        setIsAdmin(adminStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar rifa")
      } finally {
        setLoading(false)
      }
    }

    fetchRaffle()
  }, [raffleId])

  // Timer de contagem regressiva para limitação de taxa
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRateLimited && rateLimitTimer > 0) {
      interval = setInterval(() => {
        setRateLimitTimer((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRateLimited, rateLimitTimer])

  const handleAdminLogin = async () => {
    if (!adminPassword.trim()) {
      toast({
        title: "Senha Obrigatória",
        description: "Por favor, digite a senha de administrador",
        variant: "destructive",
      })
      return
    }

    setVerifying(true)

    try {
      const result = await verifyAdminPassword(raffleId, adminPassword)

      if (!result.success) {
        if (result.isRateLimited) {
          setIsRateLimited(true)
          setRateLimitTimer(60 * 60) // 1 hora em segundos
        }
        throw new Error(result.error)
      }

      if (result.isValid) {
        setIsAdmin(true)
        setAdminPassword("")
        toast({
          title: "Acesso de Administrador Concedido",
          description: "Você agora tem acesso de administrador a esta rifa",
        })
      } else {
        toast({
          title: "Senha Inválida",
          description: "A senha que você digitou está incorreta",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Falha na Verificação",
        description: err instanceof Error ? err.message : "Falha ao verificar senha",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleLogout = async () => {
    try {
      const result = await logoutAdmin(raffleId)

      if (result.success) {
        setIsAdmin(false)
        toast({
          title: "Desconectado",
          description: "Você foi desconectado do acesso de administrador",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      toast({
        title: "Falha ao Desconectar",
        description: err instanceof Error ? err.message : "Falha ao desconectar",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Carregando dados da rifa...</div>
  }

  if (error || !raffleData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Erro</CardTitle>
          <CardDescription>{error || "Falha ao carregar rifa"}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Voltar para Início
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {raffleData.title ? raffleData.title : `Rifa #${raffleData.friendly_id || raffleId.slice(0, 8)}`}
          </h1>
          <p className="text-muted-foreground">Total de Números: {raffleData.total_numbers}</p>
        </div>
        <div className="flex gap-2">
          <QRCodeDialog raffleId={raffleData.id} title={raffleData.title} friendlyId={raffleData.friendly_id} />
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair Admin
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Comprar Números</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-4">
          <RaffleNumbers raffleId={raffleData.id} totalNumbers={raffleData.total_numbers} />
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          {isAdmin ? (
            <AdminPanel
              raffleId={raffleData.id}
              totalNumbers={raffleData.total_numbers}
              friendlyId={raffleData.friendly_id}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Acesso de Administrador</CardTitle>
                <CardDescription>
                  Digite a senha de administrador para acessar os recursos de administrador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRateLimited ? (
                  <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-center">
                    <p className="text-destructive font-medium mb-2">Muitas tentativas falhas</p>
                    <p className="text-sm text-muted-foreground">
                      Por favor, tente novamente em {Math.floor(rateLimitTimer / 60)} minutos e {rateLimitTimer % 60}{" "}
                      segundos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Senha de Administrador</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                      <Button onClick={handleAdminLogin} disabled={verifying}>
                        <Lock className="mr-2 h-4 w-4" />
                        {verifying ? "Verificando..." : "Entrar"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
