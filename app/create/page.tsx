"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { createRaffle } from "@/app/actions/raffle-actions"

export default function CreateRaffle() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [totalNumbers, setTotalNumbers] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate inputs
    if (!totalNumbers || isNaN(Number(totalNumbers)) || Number(totalNumbers) <= 0) {
      setError("Please enter a valid number of raffle tickets")
      return
    }

    if (!password) {
      setError("Please enter an admin password")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const result = await createRaffle({
        title: title || undefined,
        totalNumbers: Number(totalNumbers),
        adminPassword: password,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Raffle Created",
        description: `Your raffle has been created successfully`,
      })

      // Redirect to the raffle page
      router.push(`/raffle/${result.raffleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create raffle")
      setLoading(false)
    }
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a New Raffle</CardTitle>
          <CardDescription>Set up the details for your raffle</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Raffle Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g. Charity Fundraiser"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-numbers">Total Numbers Available</Label>
              <Input
                id="total-numbers"
                type="number"
                placeholder="e.g. 100"
                value={totalNumbers}
                onChange={(e) => setTotalNumbers(e.target.value)}
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground">Enter how many numbers will be available for purchase</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Raffle"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
