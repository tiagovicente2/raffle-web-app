"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Trophy, Gift, Calendar } from "lucide-react"
import { drawWinner, getWinnersByRaffleId } from "@/app/actions/winner-actions"
import { useEffect } from "react"
import { formatDistanceToNow } from "date-fns"

interface Winner {
  id: string
  raffle_id: string
  purchase_id: string | null
  winner_name: string
  winner_cpf: string
  winning_number: number
  drawn_at: string
  notes: string | null
}

interface WinnerSectionProps {
  raffleId: string
}

export default function WinnerSection({ raffleId }: WinnerSectionProps) {
  const { toast } = useToast()
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [notes, setNotes] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const result = await getWinnersByRaffleId(raffleId)

        if (!result.success) {
          throw new Error(result.error)
        }

        setWinners(result.winners)
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load winners",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchWinners()
  }, [raffleId, toast])

  const handleDrawWinner = async () => {
    setDrawing(true)

    try {
      const result = await drawWinner({
        raffleId,
        notes: notes.trim() || undefined,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Refresh the winners list
      const winnersResult = await getWinnersByRaffleId(raffleId)
      if (winnersResult.success) {
        setWinners(winnersResult.winners)
      }

      // Show success message
      toast({
        title: "Winner Selected!",
        description: `Congratulations to ${result.winner.name} with number ${result.winner.number}!`,
      })

      // Show confetti animation
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)

      // Reset notes
      setNotes("")
    } catch (err) {
      toast({
        title: "Drawing Failed",
        description: err instanceof Error ? err.message : "Failed to draw a winner",
        variant: "destructive",
      })
    } finally {
      setDrawing(false)
    }
  }

  const formatCPF = (cpf: string) => {
    return `${cpf.substring(0, 3)}*****${cpf.substring(8)}`
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (e) {
      return dateString
    }
  }

  if (loading) {
    return <div>Loading winners...</div>
  }

  return (
    <div className="space-y-4">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {/* Simple CSS confetti animation */}
            <div className="confetti-container">
              {Array.from({ length: 100 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
            Draw a Winner
          </CardTitle>
          <CardDescription>Randomly select a winner from all purchased numbers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Optional notes about this drawing (e.g., 'First prize', 'Monthly drawing')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleDrawWinner} disabled={drawing} className="w-full">
            {drawing ? "Selecting Winner..." : "Draw Winner"}
          </Button>
        </CardFooter>
      </Card>

      {winners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="mr-2 h-5 w-5 text-primary" />
              Past Winners
            </CardTitle>
            <CardDescription>All winners drawn for this raffle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {winners.map((winner) => (
                <div key={winner.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-yellow-800 mr-2">
                          #{winner.winning_number}
                        </span>
                        <p className="font-medium">{winner.winner_name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">CPF: {formatCPF(winner.winner_cpf)}</p>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(winner.drawn_at)}
                      </div>
                      {winner.notes && <p className="mt-2 text-sm italic">"{winner.notes}"</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        .confetti-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          opacity: 0.7;
          animation: fall 5s linear forwards;
        }
        @keyframes fall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
