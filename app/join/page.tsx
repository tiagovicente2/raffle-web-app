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

export default function JoinRaffle() {
  const router = useRouter()
  const { toast } = useToast()
  const [raffleId, setRaffleId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await getRaffleById(raffleId)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Redirect to the raffle page
      router.push(`/raffle/${raffleId}`)
    } catch (err) {
      setError("Raffle not found. Please check the ID and try again.")
      setLoading(false)
    }
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join a Raffle</CardTitle>
          <CardDescription>Enter a raffle ID to join</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="raffle-id">Raffle ID</Label>
              <Input
                id="raffle-id"
                placeholder="Enter raffle ID"
                value={raffleId}
                onChange={(e) => setRaffleId(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining..." : "Join Raffle"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
