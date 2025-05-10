"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import PaymentStats from "@/components/payment-stats"
import PaymentList from "@/components/payment-list"
import { getPaymentsByRaffleId, getPaymentStatsByRaffleId } from "@/app/actions/payment-actions"
import { Loader2 } from "lucide-react"

interface PaymentDashboardProps {
  raffleId: string
}

export default function PaymentDashboard({ raffleId }: PaymentDashboardProps) {
  const { toast } = useToast()
  const [payments, setPayments] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalAmount: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    currency: "usd",
  })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch payments
      const paymentsResult = await getPaymentsByRaffleId(raffleId)
      if (!paymentsResult.success) {
        throw new Error(paymentsResult.error)
      }
      setPayments(paymentsResult.payments)

      // Fetch payment stats
      const statsResult = await getPaymentStatsByRaffleId(raffleId)
      if (!statsResult.success) {
        throw new Error(statsResult.error)
      }
      setStats(statsResult.stats)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load payment data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [raffleId, toast])

  if (loading && payments.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PaymentStats
        totalAmount={stats.totalAmount}
        successfulPayments={stats.successfulPayments}
        failedPayments={stats.failedPayments}
        pendingPayments={stats.pendingPayments}
        currency={stats.currency}
      />
      <PaymentList payments={payments} onRefresh={fetchData} isLoading={loading} />
    </div>
  )
}
