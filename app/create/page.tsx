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

    // Validar entradas
    if (!totalNumbers || isNaN(Number(totalNumbers)) || Number(totalNumbers) <= 0) {
      setError("Por favor, digite um número válido de bilhetes de rifa")
      return
    }

    if (!password) {
      setError("Por favor, digite uma senha de administrador")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
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
        title: "Rifa Criada",
        description: `Sua rifa foi criada com sucesso`,
      })

      // Redirecionar para a página da rifa
      router.push(`/raffle/${result.friendlyId || result.raffleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar rifa")
      setLoading(false)
    }
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar uma Nova Rifa</CardTitle>
          <CardDescription>Configure os detalhes para sua rifa</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Rifa (Opcional)</Label>
              <Input
                id="title"
                placeholder="ex: Arrecadação para Caridade"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-numbers">Total de Números Disponíveis</Label>
              <Input
                id="total-numbers"
                type="number"
                placeholder="ex: 100"
                value={totalNumbers}
                onChange={(e) => setTotalNumbers(e.target.value)}
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground">Digite quantos números estarão disponíveis para compra</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha de Administrador</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
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
              {loading ? "Criando..." : "Criar Rifa"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
