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
import { checkAdminAuth, getRaffleById, logoutAdmin, verifyAdminPassword } from "@/app/actions/raffle-actions"

interface RaffleData {
  id: string
  title: string | null
  total_numbers: number
  created_at: string
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

        // Check if user is already authenticated as admin
        const adminStatus = await checkAdminAuth(raffleId)
        setIsAdmin(adminStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load raffle")
      } finally {
        setLoading(false)
      }
    }

    fetchRaffle()
  }, [raffleId])

  // Rate limit countdown timer
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
        title: "Password Required",
        description: "Please enter the admin password",
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
          setRateLimitTimer(60 * 60) // 1 hour in seconds
        }
        throw new Error(result.error)
      }

      if (result.isValid) {
        setIsAdmin(true)
        setAdminPassword("")
        toast({
          title: "Admin Access Granted",
          description: "You now have admin access to this raffle",
        })
      } else {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Verification Failed",
        description: err instanceof Error ? err.message : "Failed to verify password",
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
          title: "Logged Out",
          description: "You have been logged out of admin access",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      toast({
        title: "Logout Failed",
        description: err instanceof Error ? err.message : "Failed to log out",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading raffle data...</div>
  }

  if (error || !raffleData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>{error || "Failed to load raffle"}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {raffleData.title ? raffleData.title : `Raffle #${raffleId.slice(0, 8)}`}
          </h1>
          <p className="text-muted-foreground">Total Numbers: {raffleData.total_numbers}</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout Admin
          </Button>
        )}
      </div>

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy Numbers</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-4">
          <RaffleNumbers raffleId={raffleId} totalNumbers={raffleData.total_numbers} />
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          {isAdmin ? (
            <AdminPanel raffleId={raffleId} totalNumbers={raffleData.total_numbers} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Admin Access</CardTitle>
                <CardDescription>Enter the admin password to access admin features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRateLimited ? (
                  <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-center">
                    <p className="text-destructive font-medium mb-2">Too many failed attempts</p>
                    <p className="text-sm text-muted-foreground">
                      Please try again in {Math.floor(rateLimitTimer / 60)} minutes and {rateLimitTimer % 60} seconds
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                      <Button onClick={handleAdminLogin} disabled={verifying}>
                        <Lock className="mr-2 h-4 w-4" />
                        {verifying ? "Verifying..." : "Login"}
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
