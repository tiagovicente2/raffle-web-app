"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { getPurchasesByRaffleId, purchaseNumbers } from "@/app/actions/raffle-actions"

interface RaffleNumbersProps {
  raffleId: string
  totalNumbers: number
}

export default function RaffleNumbers({ raffleId, totalNumbers }: RaffleNumbersProps) {
  const { toast } = useToast()
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const [step, setStep] = useState<"select" | "info">("select")
  const [purchasedNumbers, setPurchasedNumbers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Create an array of all numbers from 1 to totalNumbers
  const allNumbers = Array.from({ length: totalNumbers }, (_, i) => i + 1)

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const result = await getPurchasesByRaffleId(raffleId)

        if (!result.success) {
          throw new Error(result.error)
        }

        // Flatten all purchased numbers
        const allPurchasedNumbers = result.purchases.flatMap((p) => p.numbers)
        setPurchasedNumbers(allPurchasedNumbers)
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

  const handleNumberClick = (number: number) => {
    if (purchasedNumbers.includes(number)) {
      // Number is already purchased
      return
    }

    if (selectedNumbers.includes(number)) {
      // Deselect the number
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number))
    } else {
      // Select the number
      setSelectedNumbers([...selectedNumbers, number])
    }
  }

  const handleContinue = () => {
    if (selectedNumbers.length === 0) {
      toast({
        title: "No Numbers Selected",
        description: "Please select at least one number",
        variant: "destructive",
      })
      return
    }

    setStep("info")
  }

  const handlePurchase = async () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    if (!cpf.trim() || cpf.length !== 11) {
      toast({
        title: "Valid CPF Required",
        description: "Please enter a valid CPF (11 digits)",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const result = await purchaseNumbers({
        raffleId,
        name,
        cpf,
        numbers: selectedNumbers,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Update purchased numbers
      setPurchasedNumbers([...purchasedNumbers, ...selectedNumbers])

      // Show success message
      toast({
        title: "Numbers Purchased",
        description: `You have successfully purchased ${selectedNumbers.length} number(s)`,
      })

      // Reset form
      setSelectedNumbers([])
      setName("")
      setCpf("")
      setStep("select")
    } catch (err) {
      toast({
        title: "Purchase Failed",
        description: err instanceof Error ? err.message : "Failed to purchase numbers",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCPF = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "")
    return digits.slice(0, 11)
  }

  if (loading) {
    return <div>Loading raffle numbers...</div>
  }

  return (
    <div className="space-y-4">
      {step === "select" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Numbers</CardTitle>
              <CardDescription>Click on the numbers you want to purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {allNumbers.map((number) => {
                  const isPurchased = purchasedNumbers.includes(number)
                  const isSelected = selectedNumbers.includes(number)

                  return (
                    <Button
                      key={number}
                      variant={isSelected ? "default" : isPurchased ? "secondary" : "outline"}
                      className={`h-10 w-10 p-0 ${isPurchased ? "cursor-not-allowed opacity-50" : ""}`}
                      onClick={() => handleNumberClick(number)}
                      disabled={isPurchased}
                    >
                      {number}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                    <span className="text-xs">Selected</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="h-3 w-3 rounded-full bg-muted"></div>
                    <span className="text-xs">Purchased</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Selected: {selectedNumbers.length}</span>
                </div>
              </div>
              <Button className="w-full" onClick={handleContinue} disabled={selectedNumbers.length === 0}>
                Continue
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Enter your details to complete the purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="Enter your CPF"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                maxLength={11}
                required
              />
              <p className="text-xs text-muted-foreground">Enter your CPF without dots or dashes</p>
            </div>

            <div>
              <p className="text-sm font-medium">Selected Numbers:</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedNumbers.map((number) => (
                  <div
                    key={number}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button onClick={handlePurchase} disabled={submitting}>
              {submitting ? "Processing..." : "Complete Purchase"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
