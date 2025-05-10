"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Payment {
  id: string
  payment_intent_id: string
  amount: number
  currency: string
  status: string
  customer_name: string | null
  customer_email: string | null
  created_at: string
  updated_at: string
}

interface PaymentListProps {
  payments: Payment[]
  onRefresh: () => void
  isLoading: boolean
}

export default function PaymentList({ payments, onRefresh, isLoading }: PaymentListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Filtrar pagamentos com base no termo de pesquisa e filtro de status
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      !searchTerm ||
      (payment.customer_name && payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.customer_email && payment.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      payment.payment_intent_id.includes(searchTerm)

    const matchesStatus = !statusFilter || payment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
    } catch (e) {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Badge className="bg-green-500">Bem-sucedido</Badge>
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>
      case "processing":
        return <Badge className="bg-yellow-500">Processando</Badge>
      case "requires_payment_method":
        return <Badge variant="outline">Requer Pagamento</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>Visualize e gerencie todos os pagamentos para esta rifa</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pagamentos..."
                className="pl-8 w-full md:w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              className={isLoading ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Atualizar</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === "succeeded" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("succeeded")}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Bem-sucedidos
          </Button>
          <Button
            variant={statusFilter === "failed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("failed")}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Falhos
          </Button>
          <Button
            variant={statusFilter === "processing" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("processing")}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Processando
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {payments.length === 0
              ? "Nenhum pagamento encontrado para esta rifa"
              : "Nenhum pagamento corresponde aos seus critérios de busca"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="rounded-lg border p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{payment.customer_name || "Cliente Anônimo"}</h3>
                      {getStatusBadge(payment.status)}
                    </div>
                    {payment.customer_email && (
                      <p className="text-sm text-muted-foreground">{payment.customer_email}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">ID: {payment.payment_intent_id}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm">
                        <span className="font-medium">Valor:</span> {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Data:</span> {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
