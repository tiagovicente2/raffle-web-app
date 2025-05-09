import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Raffle App</h1>
          <p className="text-muted-foreground">Create or join a raffle</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create a New Raffle</CardTitle>
            <CardDescription>Set up a new raffle as an admin</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/create" className="w-full">
              <Button className="w-full">Create Raffle</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a Raffle</CardTitle>
            <CardDescription>Enter a raffle code to join</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/join" className="w-full">
              <Button variant="outline" className="w-full">
                Join Raffle
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
