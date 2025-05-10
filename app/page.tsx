import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Aplicativo de Rifa</h1>
          <p className="text-muted-foreground">Crie ou participe de uma rifa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar uma Nova Rifa</CardTitle>
            <CardDescription>Configure uma nova rifa como administrador</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/create" className="w-full">
              <Button className="w-full">Criar Rifa</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participar de uma Rifa</CardTitle>
            <CardDescription>Digite um código de rifa para participar</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/join" className="w-full">
              <Button variant="outline" className="w-full">
                Participar da Rifa
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
