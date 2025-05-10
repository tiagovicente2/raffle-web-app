"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface PaymentStatsProps {
  totalAmount: number
  successfulPayments: number
  failedPayments: number
  pendingPayments: number
  currency?: string
}

export default function PaymentStats({
  totalAmount,
  successfulPayments,
  failedPayments,
  pendingPayments,
  currency = "BRL",
}: PaymentStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          <p className="text-xs text-muted-foreground">
            De {successfulPayments} pagamento{successfulPayments !== 1 ? "s" : ""} bem-sucedido
            {successfulPayments !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pagamentos Bem-sucedidos</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successfulPayments}</div>
          <p className="text-xs text-muted-foreground">
            {successfulPayments > 0
              ? `${((successfulPayments / (successfulPayments + failedPayments + pendingPayments)) * 100).toFixed(1)}% taxa de sucesso`
              : "Nenhum pagamento bem-sucedido ainda"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pagamentos Falhos</CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{failedPayments}</div>
          <p className="text-xs text-muted-foreground">
            {failedPayments > 0
              ? `${((failedPayments / (successfulPayments + failedPayments + pendingPayments)) * 100).toFixed(1)}% taxa de falha`
              : "Nenhum pagamento falho"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingPayments}</div>
          <p className="text-xs text-muted-foreground">
            {pendingPayments > 0
              ? `${pendingPayments} pagamento${pendingPayments !== 1 ? "s" : ""} aguardando conclusão`
              : "Nenhum pagamento pendente"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
